const VERSION="v41-wd-bersih-shared-realtime";
const COOKIE_NAME="thelastmoon_session";
const MAX_JSON_BYTES=1024*1024;

class AppError extends Error{
  constructor(status,message,stage=""){
    super(message);
    this.name="AppError";
    this.status=status;
    this.stage=stage;
  }
}

let schemaReady=false;

export async function onRequest(context){
  const{request,env}=context;
  const url=new URL(request.url);

  try{
    if(!env.DB){
      throw new AppError(500,"Binding database DB belum ditemukan.","binding");
    }

    if(request.method==="POST"){
      const origin=request.headers.get("Origin");
      if(origin&&origin!==url.origin){
        throw new AppError(403,"Permintaan lintas situs ditolak.","origin");
      }
    }

    await ensureSchema(env.DB);

    const user=await getSessionUser(request,env.DB);
    if(!user){
      throw new AppError(401,"Sesi login habis. Silakan login ulang.","session");
    }

    requirePencairanAccess(user);

    const action=String(url.searchParams.get("action")||"list").trim().toLowerCase();

    if(request.method==="GET"&&action==="list"){
      return listNames(env.DB);
    }

    if(request.method==="POST"&&action==="bulk"){
      return bulkUpsert(request,env.DB,user);
    }

    throw new AppError(404,`Action WD Bersih tidak ditemukan: ${action}`,"action");
  }catch(error){
    console.error("WD Bersih API error:",error);

    if(error instanceof AppError){
      return json({
        success:false,
        error:error.message,
        stage:error.stage||undefined,
        version:VERSION
      },error.status);
    }

    return json({
      success:false,
      error:"Terjadi kesalahan pada database WD Bersih.",
      detail:String(error?.message||error||"Unknown error").slice(0,600),
      version:VERSION
    },500);
  }
}

async function ensureSchema(db){
  if(schemaReady)return;

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS wd_bersih_names(
      match_key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      full_text TEXT NOT NULL,
      created_by INTEGER,
      updated_by INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_wd_bersih_updated ON wd_bersih_names(updated_at DESC)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_wd_bersih_name ON wd_bersih_names(name)`)
  ]);

  schemaReady=true;
}

async function listNames(db){
  const result=await db.prepare(`
    SELECT match_key,name,full_text,created_by,updated_by,created_at,updated_at
    FROM wd_bersih_names
    ORDER BY full_text COLLATE NOCASE
  `).all();

  const items=(result.results||[]).map(row=>({
    key:String(row.match_key||""),
    name:String(row.name||""),
    full:String(row.full_text||""),
    createdBy:row.created_by==null?null:Number(row.created_by),
    updatedBy:row.updated_by==null?null:Number(row.updated_by),
    createdAt:Number(row.created_at||0),
    updatedAt:Number(row.updated_at||0)
  }));

  const revision=items.reduce((max,item)=>Math.max(max,Number(item.updatedAt||0)),0);

  return json({
    success:true,
    items,
    total:items.length,
    revision,
    version:VERSION
  });
}

async function bulkUpsert(request,db,user){
  const body=await readJson(request);
  const input=Array.isArray(body.items)?body.items:[];

  if(!input.length){
    throw new AppError(400,"Tidak ada nama WD Bersih yang dikirim.","bulk-empty");
  }

  if(input.length>5000){
    throw new AppError(400,"Maksimal 5000 nama per simpan.","bulk-limit");
  }

  const unique=new Map();

  for(const raw of input){
    const full=cleanText(raw?.full,600);
    let name=cleanText(raw?.name,300);

    if(!full)continue;
    if(!name)name=extractName(full);

    const key=matchKey(name);
    if(!key||!name)continue;

    unique.set(key,{key,name,full});
  }

  if(!unique.size){
    throw new AppError(400,"Tidak ada nama WD Bersih yang valid.","bulk-invalid");
  }

  const now=Date.now();
  const statements=[];

  for(const item of unique.values()){
    statements.push(
      db.prepare(`
        INSERT INTO wd_bersih_names(
          match_key,name,full_text,created_by,updated_by,created_at,updated_at
        )
        VALUES(?,?,?,?,?,?,?)
        ON CONFLICT(match_key) DO UPDATE SET
          name=excluded.name,
          full_text=excluded.full_text,
          updated_by=excluded.updated_by,
          updated_at=excluded.updated_at
      `).bind(
        item.key,item.name,item.full,
        user.id,user.id,now,now
      )
    );
  }

  let changed=0;

  for(let i=0;i<statements.length;i+=100){
    const results=await db.batch(statements.slice(i,i+100));
    changed+=results.reduce((sum,row)=>sum+Number(row?.meta?.changes||0),0);
  }

  const totalRow=await db.prepare(`SELECT COUNT(*) AS total FROM wd_bersih_names`).first();

  return json({
    success:true,
    saved:changed,
    received:unique.size,
    total:Number(totalRow?.total||0),
    revision:now,
    version:VERSION
  });
}

function extractName(fullText){
  let name=cleanText(fullText,600);
  const slash=name.indexOf("/");
  if(slash!==-1)name=name.slice(slash+1);

  return name
    .replace(/\(\s*WD\s*BERSIH\s*\)/ig,"")
    .replace(/\bWD\s*BERSIH\b/ig,"")
    .trim()
    .slice(0,300);
}

function matchKey(value){
  return cleanText(value,300).toUpperCase().replace(/\s+/g," ").trim();
}

function cleanText(value,max){
  return String(value??"")
    .replace(/\u00A0/g," ")
    .replace(/<br\s*\/?>/gi," ")
    .trim()
    .slice(0,max);
}

async function getSessionUser(request,db){
  const rawToken=readCookie(request.headers.get("Cookie"),COOKIE_NAME);
  if(!rawToken)return null;

  const tokenHash=await sha256(rawToken);

  return db.prepare(`
    SELECT u.*
    FROM sessions s
    JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=?
      AND s.expires_at>?
      AND u.active=1
    LIMIT 1
  `).bind(tokenHash,Date.now()).first();
}

function requirePencairanAccess(user){
  if(Number(user?.is_master)===1)return;

  let permissions=[];
  try{permissions=JSON.parse(user?.permissions||"[]")}
  catch(_){permissions=[]}

  if(!Array.isArray(permissions)||!permissions.includes("pencairan-xpay")){
    throw new AppError(403,"Akun ini tidak memiliki akses Pencairan XPAY.","permission");
  }
}

async function readJson(request){
  const size=Number(request.headers.get("Content-Length")||0);

  if(size>MAX_JSON_BYTES){
    throw new AppError(413,"Data terlalu besar.","request-size");
  }

  try{return await request.json()}
  catch(_){throw new AppError(400,"Format JSON tidak valid.","request-json")}
}

function readCookie(header,name){
  const source=String(header||"");

  for(const part of source.split(";")){
    const index=part.indexOf("=");
    if(index<0)continue;
    const key=part.slice(0,index).trim();
    if(key!==name)continue;
    return decodeURIComponent(part.slice(index+1).trim());
  }

  return"";
}

async function sha256(value){
  const bytes=new TextEncoder().encode(String(value||""));
  const digest=await crypto.subtle.digest("SHA-256",bytes);

  return[...new Uint8Array(digest)]
    .map(byte=>byte.toString(16).padStart(2,"0"))
    .join("");
}

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Cache-Control":"no-store"
    }
  });
}