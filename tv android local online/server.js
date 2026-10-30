const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

function proxyUrl(targetUrl) {
  return `/proxy?url=${encodeURIComponent(targetUrl)}`;
}

function rewriteManifest(text, baseUrl) {
  const rewriteUri = (uri) => {
    try {
      const resolved = new URL(uri, baseUrl);
      if (!["http:", "https:"].includes(resolved.protocol)) return uri;
      return proxyUrl(resolved.href);
    } catch {
      return uri;
    }
  };

  return text.split(/\r?\n/).map((line) => {
    if (!line.trim()) return line;
    if (line.trimStart().startsWith("#")) {
      return line.replace(/(\bURI=")([^"]+)(")/gi, (_match, prefix, uri, suffix) => `${prefix}${rewriteUri(uri)}${suffix}`);
    }
    const leading = line.match(/^\s*/)[0];
    const trailing = line.match(/\s*$/)[0];
    return `${leading}${rewriteUri(line.trim())}${trailing}`;
  }).join("\n");
}

function proxyStream(targetUrl, request, response) {
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    response.writeHead(400).end("Invalid target URL");
    return;
  }
  if (!"https:http".includes(parsed.protocol.replace(":", ""))) {
    response.writeHead(400).end("Unsupported protocol");
    return;
  }
  const upstreamRequest = parsed.protocol === "https:" ? require("node:https").request : http.request;
  const upstreamHeaders = { "User-Agent": request.headers["user-agent"] || "OSTVPlayer/1.0" };
  if (request.headers.range) upstreamHeaders.Range = request.headers.range;
  const upstream = upstreamRequest(parsed, {
    method: request.method === "HEAD" ? "GET" : request.method,
    headers: upstreamHeaders,
  }, (upstreamResponse) => {
    const headers = { "Access-Control-Allow-Origin": "*" };
    for (const header of ["content-type", "content-length", "content-range", "accept-ranges"])
      if (upstreamResponse.headers[header]) headers[header] = upstreamResponse.headers[header];

    const contentType = upstreamResponse.headers["content-type"] || "";
    const isManifest = /\.m3u8$/i.test(parsed.pathname) || /mpegurl/i.test(contentType);
    if (isManifest) {
      const chunks = [];
      upstreamResponse.on("data", (chunk) => chunks.push(chunk));
      upstreamResponse.on("end", () => {
        const body = rewriteManifest(Buffer.concat(chunks).toString("utf8"), parsed.href);
        delete headers["content-length"];
        response.writeHead(upstreamResponse.statusCode, headers);
        response.end(body);
      });
      return;
    }

    response.writeHead(upstreamResponse.statusCode, headers);
    upstreamResponse.pipe(response);
  });
  request.on("aborted", () => upstream.destroy());
  request.on("error", () => upstream.destroy());
  response.on("close", () => {
    if (!response.writableEnded) upstream.destroy();
  });
  response.on("error", () => upstream.destroy());
  upstream.on("error", () => {
    if (!response.headersSent) response.writeHead(502, { "Access-Control-Allow-Origin": "*" });
    try { response.end("Upstream error"); } catch {}
  });
  upstream.end();
}

const root = path.resolve(__dirname);
const port = Number(process.env.PORT) || 4173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

http.createServer((request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range",
    }).end();
    return;
  }
  if (request.url.startsWith("/proxy?url=")) {
    proxyStream(decodeURIComponent(request.url.slice("/proxy?url=".length)), request, response);
    return;
  }
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const requestedPath = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);

  if (!requestedPath.startsWith(`${root}${path.sep}`) && requestedPath !== root) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  fs.stat(requestedPath, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(requestedPath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    });
    fs.createReadStream(requestedPath).pipe(response);
  });
}).listen(port, "0.0.0.0", () => {
  console.log(`OS TV Android berjalan di http://localhost:${port}`);
});