const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function jsonError(status, error, diagnostics = []) {
  return new Response(
    JSON.stringify({
      ok: false,
      error,
      diagnostics
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}

function isPrivateHost(hostname) {
  const host = String(hostname || "")
    .toLowerCase()
    .replace(/^\[|\]$/g, "");

  if (
    host === "localhost" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) return true;

  if (
    /^127\./.test(host) ||
    /^0\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host)
  ) return true;

  const m = host.match(/^172\.(\d+)\./);

  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }

  if (
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("fe80:")
  ) return true;

  return false;
}

function googleFileId(url) {
  const text = String(url || "");

  const match =
    text.match(/lh\d*\.googleusercontent\.com\/d\/([^/?=#]+)/i) ||
    text.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i) ||
    text.match(/[?&]id=([^&#]+)/i);

  return match ? match[1] : "";
}

function buildCandidates(targetUrl) {
  const result = [];
  const id = googleFileId(targetUrl);

  if (id) {
    result.push(
      `https://lh3.googleusercontent.com/d/${id}`,
      `https://lh3.googleusercontent.com/d/${id}=s0`,
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`,
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`,
      `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=view`
    );
  }

  result.push(targetUrl);

  return [...new Set(result.filter(Boolean))];
}

function sniffImageType(bytes, headerType) {
  const type = String(headerType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  if (type.startsWith("image/")) return type;

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) return "image/png";

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) return "image/jpeg";

  if (bytes.length >= 6) {
    const gif = String.fromCharCode(...bytes.slice(0, 6));
    if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  }

  if (bytes.length >= 12) {
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));

    if (riff === "RIFF" && webp === "WEBP") {
      return "image/webp";
    }
  }

  return "";
}

async function fetchImageCandidate(candidate) {
  let response;

  try {
    response = await fetch(candidate, {
      method: "GET",
      redirect: "follow",
      headers: {
        "Accept":
          "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36"
      }
    });
  } catch (error) {
    return {
      ok: false,
      url: candidate,
      detail: "fetch-error"
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      url: candidate,
      detail: `HTTP ${response.status}`
    };
  }

  const declaredLength = Number(
    response.headers.get("content-length") || 0
  );

  if (declaredLength > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      url: candidate,
      detail: "too-large"
    };
  }

  const buffer = await response.arrayBuffer();

  if (
    !buffer.byteLength ||
    buffer.byteLength > MAX_IMAGE_BYTES
  ) {
    return {
      ok: false,
      url: candidate,
      detail: "invalid-size"
    };
  }

  const bytes = new Uint8Array(buffer);

  const contentType = sniffImageType(
    bytes,
    response.headers.get("content-type")
  );

  if (!contentType) {
    return {
      ok: false,
      url: candidate,
      detail:
        "not-image:" +
        String(response.headers.get("content-type") || "unknown")
    };
  }

  return {
    ok: true,
    url: candidate,
    buffer,
    contentType
  };
}

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const raw = String(
    requestUrl.searchParams.get("url") || ""
  ).trim();

  if (!raw) {
    return jsonError(
      400,
      "Link gambar belum diisi."
    );
  }

  let target;

  try {
    target = new URL(raw);
  } catch (_) {
    return jsonError(
      400,
      "Format link gambar tidak valid."
    );
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    return jsonError(
      400,
      "Link gambar harus menggunakan http atau https."
    );
  }

  if (
    target.username ||
    target.password ||
    isPrivateHost(target.hostname)
  ) {
    return jsonError(
      400,
      "Alamat gambar tersebut tidak diizinkan."
    );
  }

  const candidates = buildCandidates(target.toString());
  const diagnostics = [];

  for (const candidate of candidates) {
    const result = await fetchImageCandidate(candidate);

    if (!result.ok) {
      diagnostics.push({
        url: candidate,
        detail: result.detail
      });
      continue;
    }

    return new Response(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Length": String(result.buffer.byteLength),
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*",
        "X-Image-Source": result.url
      }
    });
  }

  return jsonError(
    502,
    "Google/CDN tidak memberikan file gambar ke Cloudflare. Background direct-browser tetap akan dicoba.",
    diagnostics
  );
}

export async function onRequest(context) {
  if (context.request.method !== "GET") {
    return jsonError(
      405,
      "Method tidak diizinkan."
    );
  }

  return onRequestGet(context);
}
