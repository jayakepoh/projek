const STORAGE_KEY = "nusantara-tv.channels.v1";
const PLAYLIST_SOURCE_KEY = `${STORAGE_KEY}.source`;
const channelList = document.querySelector("#channel-list");
const groupList = document.querySelector("#group-list");
const searchInput = document.querySelector("#search-input");
const video = document.querySelector("#video-player");
const playerEmpty = document.querySelector("#player-empty");
const playerStatus = document.querySelector("#player-status");
const dialog = document.querySelector("#source-dialog");
const dialogError = document.querySelector("#dialog-error");
let channels = readChannels();
let activeChannel = null;
let selectedGroup = "Semua kanal";
let recentOnly = false;
let recentIds = [];
let hlsInstance = null;
let installPrompt = null;

function readChannels() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((channel) => channel.name && channel.url) : [];
  } catch {
    return [];
  }
}

function saveChannels() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
}

function getGroups() {
  return [...new Set(channels.map((channel) => channel.group || "Lainnya"))].sort((a, b) => a.localeCompare(b, "id"));
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "TV";
}

function createChannelId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  if (typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function renderGroups() {
  const groups = ["Semua kanal", ...getGroups()];
  if (!groups.includes(selectedGroup)) selectedGroup = "Semua kanal";
  groupList.replaceChildren(...groups.map((group) => {
    const count = group === "Semua kanal" ? channels.length : channels.filter((channel) => channel.group === group).length;
    const button = document.createElement("button");
    button.className = `group-button${selectedGroup === group ? " active" : ""}`;
    button.type = "button";
    button.setAttribute("aria-current", selectedGroup === group ? "true" : "false");
    button.innerHTML = `<span></span><span>${count}</span>`;
    button.firstElementChild.textContent = group;
    button.addEventListener("click", () => {
      selectedGroup = group;
      document.querySelector("#current-group").textContent = group.toLocaleUpperCase("id");
      renderGroups();
      renderChannels();
    });
    return button;
  }));
  document.querySelector("#channel-count").textContent = `${channels.length} kanal`;
}

function renderChannels() {
  const query = searchInput.value.trim().toLocaleLowerCase("id");
  const visible = channels.filter((channel) => {
    const matchesGroup = selectedGroup === "Semua kanal" || channel.group === selectedGroup;
    const matchesQuery = `${channel.name} ${channel.group}`.toLocaleLowerCase("id").includes(query);
    const matchesRecent = !recentOnly || recentIds.includes(channel.id);
    return matchesGroup && matchesQuery && matchesRecent;
  });

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    const title = document.createElement("strong");
    const description = document.createElement("span");
    title.textContent = channels.length ? "Kanal tidak ditemukan" : "Belum ada playlist";
    description.textContent = channels.length ? "Coba kata kunci atau kategori lain." : "Impor playlist M3U — daftar baru akan menimpa daftar lama.";
    empty.append(title, description);
    channelList.replaceChildren(empty);
  } else {
    channelList.replaceChildren(...visible.map((channel) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `channel-row${activeChannel?.id === channel.id ? " active" : ""}`;
      button.setAttribute("aria-label", `Putar ${channel.name}`);
      const icon = document.createElement("span");
      icon.className = "channel-icon";
      icon.textContent = initials(channel.name);
      const details = document.createElement("span");
      details.className = "channel-details";
      const name = document.createElement("strong");
      name.textContent = channel.name;
      const group = document.createElement("span");
      group.textContent = channel.group || "Lainnya";
      details.append(name, group);
      const live = document.createElement("span");
      live.className = "channel-live";
      button.append(icon, details, live);
      button.addEventListener("click", () => playChannel(channel));
      return button;
    }));
  }
  document.querySelector("#guide-footer-text").textContent = channels.length ? `${channels.length} kanal dalam playlist` : "Menunggu playlist";
}

function showStatus(message) {
  playerStatus.textContent = message;
  playerStatus.hidden = false;
}

function hideStatus() {
  playerStatus.hidden = true;
  playerStatus.textContent = "";
}

function playChannel(channel) {
  activeChannel = channel;
  recentIds = [channel.id, ...recentIds.filter((id) => id !== channel.id)].slice(0, 12);
  document.querySelector("#now-title").textContent = channel.name;
  document.querySelector("#now-group").textContent = channel.group || "Lainnya";
  document.querySelector("#now-channel-icon").textContent = initials(channel.name);
  playerEmpty.hidden = true;
  video.hidden = false;
  hideStatus();
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  video.pause();
  video.removeAttribute("src");
  video.load();

  const isHls = /\.m3u8(?:$|[?#])/i.test(channel.url);
  const localProxy = (url) => `/proxy?url=${encodeURIComponent(url)}`;
  const onLocalhost = ["localhost", "127.0.0.1"].includes(location.hostname);
  const startHls = (sourceUrl, usingProxy = false) => {
    if (hlsInstance) hlsInstance.destroy();
    const hls = new window.Hls();
    hlsInstance = hls;
    hls.loadSource(sourceUrl);
    hls.attachMedia(video);
    hls.on(window.Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => showStatus("Tekan tombol putar untuk memulai siaran.")));
    hls.on(window.Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      // Coba sekali lewat proxy lokal bila stream diblokir CORS.
      if (onLocalhost && !usingProxy) {
        showStatus("Mencoba lewat proxy lokal...");
        startHls(localProxy(channel.url), true);
        return;
      }
      showStatus("Siaran tidak dapat dimuat. Periksa URL, koneksi, dan izin akses stream.");
    });
  };
  if (isHls && window.Hls?.isSupported()) {
    startHls(onLocalhost ? localProxy(channel.url) : channel.url, onLocalhost);
  } else {
    video.src = onLocalhost ? localProxy(channel.url) : channel.url;
    video.play().catch(() => showStatus("Tekan tombol putar. Beberapa stream memerlukan format yang didukung browser."));
  }
  renderChannels();
}

function parseM3U(text, playlistUrl) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const parsed = [];
  let pending = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#EXTINF:")) {
      // Nama kanal adalah teks setelah koma TERAKHIR — atribut bisa berisi koma.
      const comma = line.lastIndexOf(",");
      const metadata = comma >= 0 ? line.slice(0, comma) : line;
      const name = comma >= 0 ? line.slice(comma + 1).trim() : "Kanal tanpa nama";
      const group = metadata.match(/group-title="([^"]*)"/i)?.[1]?.trim() || "Lainnya";
      pending = { name, group };
    } else if (!line.startsWith("#") && pending) {
      // Selesaikan URL relatif terhadap URL playlist (praktik umum di M3U).
      let candidate = null;
      try {
        candidate = new URL(line, playlistUrl ?? undefined).href;
      } catch {
        // bukan URL absolut dan tidak ada URL playlist — lewati
        pending = null;
      }
      if (!candidate) {
        pending = null;
        continue;
      }
      try {
        const url = new URL(candidate);
        if (["http:", "https:"].includes(url.protocol)) {
          parsed.push({ id: createChannelId(), name: pending.name, group: pending.group, url: url.href });
        }
      } catch {
        pending = null;
      }
      pending = null;
    }
  }
  return parsed;
}

function importPlaylist(text, playlistUrl) {
  const parsed = parseM3U(text, playlistUrl);
  if (!parsed.length) {
    dialogError.textContent = "Tidak menemukan kanal yang valid. Pastikan playlist berisi baris #EXTINF dan URL HTTP/HTTPS.";
    dialogError.hidden = false;
    return;
  }
  channels = parsed;
  activeChannel = null;
  saveChannels();
  localStorage.setItem(PLAYLIST_SOURCE_KEY, "custom");
  selectedGroup = "Semua kanal";
  dialogError.hidden = true;
  document.querySelector("#current-group").textContent = "SEMUA KANAL";
  dialog.close();
  renderGroups();
  renderChannels();
}

async function loadDefaultPlaylist() {
  if (localStorage.getItem(PLAYLIST_SOURCE_KEY) === "custom") return;
  try {
    const response = await fetch("/channels-clean.m3u");
    if (!response.ok) return;
    const playlistUrl = new URL("/channels-clean.m3u", location.href).href;
    const parsed = parseM3U(await response.text(), playlistUrl);
    if (!parsed.length) return;
    const bundledUrls = new Set(parsed.map((channel) => channel.url));
    if (channels.length && !channels.every((channel) => bundledUrls.has(channel.url))) {
      localStorage.setItem(PLAYLIST_SOURCE_KEY, "custom");
      return;
    }
    const currentUrls = new Set(channels.map((channel) => channel.url));
    const currentNames = new Set(channels.map((channel) => channel.name.trim().replace(/\s+/g, " ").toLocaleLowerCase("id")));
    const additions = parsed.filter((channel) => {
      const name = channel.name.trim().replace(/\s+/g, " ").toLocaleLowerCase("id");
      if (currentUrls.has(channel.url) || currentNames.has(name)) return false;
      currentUrls.add(channel.url);
      currentNames.add(name);
      return true;
    });
    localStorage.setItem(PLAYLIST_SOURCE_KEY, "default");
    if (!additions.length) return;
    channels = [...channels, ...additions];
    saveChannels();
    renderGroups();
    renderChannels();
  } catch {}
}

function openDialog() {
  dialogError.hidden = true;
  dialog.showModal();
}

document.querySelector("#manage-sources").addEventListener("click", openDialog);
document.querySelector("#guide-import").addEventListener("click", openDialog);
document.querySelector("#empty-import").addEventListener("click", openDialog);
searchInput.addEventListener("input", renderChannels);
document.querySelector("#load-text").addEventListener("click", () => importPlaylist(document.querySelector("#playlist-text").value));
let activePlaylistUrl = null;
document.querySelector("#playlist-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (file) {
    activePlaylistUrl = null;
    importPlaylist(await file.text());
  }
  event.target.value = "";
});
document.querySelector("#load-url").addEventListener("click", async () => {
  const url = document.querySelector("#playlist-url").value.trim();
  if (!url) {
    dialogError.textContent = "Masukkan URL playlist terlebih dahulu.";
    dialogError.hidden = false;
    return;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Respons server tidak berhasil.");
    activePlaylistUrl = response.url || url;
    importPlaylist(await response.text(), activePlaylistUrl);
  } catch {
    dialogError.textContent = "Playlist tidak dapat diambil. Server mungkin memblokir akses browser (CORS); coba impor file atau tempel isi M3U.";
    dialogError.hidden = false;
  }
});
document.querySelectorAll(".filter-chip").forEach((button) => {
  button.addEventListener("click", () => {
    recentOnly = button.dataset.filter === "recent";
    document.querySelectorAll(".filter-chip").forEach((chip) => {
      const active = chip === button;
      chip.classList.toggle("active", active);
      chip.setAttribute("aria-selected", String(active));
    });
    renderChannels();
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  document.querySelector("#install-button").hidden = false;
});
document.querySelector("#install-button").addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  document.querySelector("#install-button").hidden = true;
});
video.addEventListener("playing", hideStatus);
video.addEventListener("error", () => {
  if (activeChannel) showStatus("Sumber tidak bisa diputar di browser ini. Periksa format dan hak akses stream.");
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(() => {});
renderGroups();
renderChannels();
loadDefaultPlaylist();