const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function jsonError(status, error) {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function isPrivateHost(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");

  if (
    host === "localhost" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) return true;

  if (/^127\./.test(host) || /^0\./.test(host) || /^10\./.test(host)) return true;
  if (/^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;

  const m = host.match(/^172\.(\d+)\./);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }

  if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return true;

  return false;
}

function sniffImageType(bytes, headerType) {
  const type = String(headerType || "").split(";")[0].trim().toLowerCase();
  if (type.startsWith("image/")) return type;

  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";

  if (bytes.length >= 6) {
    const gif = String.fromCharCode(...bytes.slice(0, 6));
    if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  }

  if (bytes.length >= 12) {
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  }

  return "";
}

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const raw = String(requestUrl.searchParams.get("url") || "").trim();

  if (!raw) return jsonError(400, "Link gambar belum diisi.");

  let target;
  try {
    target = new URL(raw);
  } catch (_) {
    return jsonError(400, "Format link gambar tidak valid.");
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    return jsonError(400, "Link gambar harus menggunakan http atau https.");
  }

  if (target.username || target.password || isPrivateHost(target.hostname)) {
    return jsonError(400, "Alamat gambar tersebut tidak diizinkan.");
  }

  let upstream;
  try {
    upstream = await fetch(target.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 TheLastMoon-ImageProxy/1.0"
      }
    });
  } catch (_) {
    return jsonError(502, "Cloudflare tidak dapat mengambil gambar dari link tersebut.");
  }

  if (!upstream.ok) {
    return jsonError(502, `Server gambar membalas HTTP ${upstream.status}.`);
  }

  const declaredLength = Number(upstream.headers.get("content-length") || 0);
  if (declaredLength > MAX_IMAGE_BYTES) return jsonError(413, "Ukuran gambar terlalu besar. Maksimal 12 MB.");

  const buffer = await upstream.arrayBuffer();
  if (!buffer.byteLength) return jsonError(422, "File gambar kosong.");
  if (buffer.byteLength > MAX_IMAGE_BYTES) return jsonError(413, "Ukuran gambar terlalu besar. Maksimal 12 MB.");

  const bytes = new Uint8Array(buffer);
  const contentType = sniffImageType(bytes, upstream.headers.get("content-type"));
  if (!contentType) return jsonError(415, "Link tersebut tidak menghasilkan file gambar.");

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function onRequest(context) {
  if (context.request.method !== "GET") return jsonError(405, "Method tidak diizinkan.");
  return onRequestGet(context);
}
