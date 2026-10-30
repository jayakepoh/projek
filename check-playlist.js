// Pemeriksa kesehatan playlist: memeriksa tiap URL kanal di channels-id.m3u
// dan menulis playlist bersih hanya berisi kanal yang masih hidup.
//
// Pemakaian:
//   node check-playlist.js [file.m3u]            -> laporan di terminal
//   node check-playlist.js [file.m3u] --write    -> juga tulis channels-clean.m3u
//
// Pemeriksaan ringan: hanya mengambil segmen pertama/manifest, tanpa mendekode video.
// Kanal yang butuh header khusus (referrer/user-agent dari #EXTVLCOPT) diperiksa
// dengan header tersebut agar adil.

const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");

const file = process.argv[2] || "channels-id.m3u";
const writeOut = process.argv.includes("--write");
const CONCURRENCY = 8;
const TIMEOUT_MS = 8_000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36 OSTVChecker/1.0";

function parseM3u(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const channels = [];
  let pending = null;
  let extras = {};
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#EXTINF")) {
      // Nama kanal adalah teks setelah koma TERAKHIR (atribut bisa berisi koma).
      const comma = line.lastIndexOf(",");
      pending = {
        name: comma >= 0 ? line.slice(comma + 1).trim() : "Tanpa nama",
        group: line.match(/group-title="([^"]*)"/i)?.[1]?.trim() || "Lainnya",
        raw: [line],
      };
      extras = {};
    } else if (line.startsWith("#EXTVLCOPT")) {
      const [, kv] = line.split("=");
      const [key, ...rest] = (kv || "").split("=");
      extras[key.trim().toLowerCase()] = rest.join("=").trim();
      pending?.raw.push(line);
    } else if (line.startsWith("#")) {
      pending?.raw.push(line);
    } else if (pending) {
      if (/^https?:\/\//i.test(line)) {
        channels.push({ ...pending, url: line, extras });
      }
      pending = null;
      extras = {};
    }
  }
  return channels;
}

function probe(channel) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(channel.url);
    } catch {
      resolve({ ...channel, state: "INVALID", detail: "URL tidak valid" });
      return;
    }
    const headers = { "User-Agent": channel.extras["http-user-agent"] || UA };
    if (channel.extras["http-referrer"]) headers.Referer = channel.extras["http-referrer"];
    const req = (url.protocol === "https:" ? https : http).get(url, {
      headers,
      timeout: TIMEOUT_MS,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Ikuti redirect (maks 5 lompatan) sebelum menyimpulkan.
        if ((channel._hops || 0) < 5) {
          res.resume();
          const next = new URL(res.headers.location, channel.url).href;
          resolve(probe({ ...channel, url: next, _hops: (channel._hops || 0) + 1 }));
          return;
        }
        resolve({ ...channel, state: "REDIRECT", detail: res.headers.location.slice(0, 80) });
        res.resume();
        return;
      }
      if (res.statusCode !== 200) {
        resolve({ ...channel, state: "DEAD", detail: `HTTP ${res.statusCode}` });
        res.resume();
        return;
      }
      // Baca sebagian isi: manifest HLS valid dimulai dengan #EXTM3U.
      let body = "";
      let done = false;
      const finish = (state, detail) => {
        if (done) return;
        done = true;
        res.destroy();
        resolve({ ...channel, state, detail });
      };
      res.on("data", (chunk) => {
        body += chunk;
        if (body.length > 512) {
          const head = body.slice(0, 512);
          finish(head.includes("#EXTM3U") || head.includes("#EXT-X")
            ? "ALIVE" : "SUSPECT", head.includes("#EXTM3U") || head.includes("#EXT-X") ? "" : "isi bukan manifest HLS");
        }
      });
      res.on("end", () => {
        const ok = body.includes("#EXTM3U") || body.includes("#EXT-X");
        finish(ok ? "ALIVE" : "SUSPECT", ok ? "" : body ? "isi bukan manifest HLS" : "respons kosong");
      });
      res.on("error", () => finish("SUSPECT", "koneksi terputus saat membaca"));
    });
    req.on("timeout", () => { req.destroy(); resolve({ ...channel, state: "DEAD", detail: "timeout" }); });
    req.on("error", (e) => resolve({ ...channel, state: "DEAD", detail: e.code || e.message }));
  });
}

async function main() {
  const text = fs.readFileSync(file, "utf8");
  const channels = parseM3u(text);
  console.log(`Memeriksa ${channels.length} kanal dari ${file} ...\n`);

  const results = [];
  for (let i = 0; i < channels.length; i += CONCURRENCY) {
    const batch = channels.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(batch.map(probe));
    settled.forEach((r) => {
      const mark = { ALIVE: "✔", REDIRECT: "↷", SUSPECT: "?", DEAD: "✘", INVALID: "✘" }[r.state];
      console.log(`${mark} [${r.state.padEnd(8)}] ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
    });
    results.push(...settled);
  }

  const alive = results.filter((r) => r.state === "ALIVE" || r.state === "REDIRECT");
  console.log(`\nRingkasan: ${alive.length}/${results.length} kanal hidup.`);
  const byState = {};
  for (const r of results) byState[r.state] = (byState[r.state] || 0) + 1;
  console.log("Rincian:", JSON.stringify(byState));

  if (writeOut) {
    const out = ["#EXTM3U",
      ...alive.map((c) => [...c.raw, c.url].join("\n"))].join("\n\n") + "\n";
    fs.writeFileSync("channels-clean.m3u", out, "utf8");
    console.log("Playlist bersih ditulis ke channels-clean.m3u");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
