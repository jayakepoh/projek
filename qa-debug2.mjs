export default async function run(page) {
  // Coba muat manifest CNN lewat proxy lokal langsung dari konteks halaman.
  const r = await page.evaluate(async () => {
    try {
      const res = await fetch('/proxy?url=' + encodeURIComponent('https://video.detik.com/livecnn/smil:cnntv/chunklist_w268557525_b384000_sleng.m3u8'));
      const text = await res.text();
      return { status: res.status, head: text.slice(0, 120) };
    } catch (e) { return { error: String(e) }; }
  });
  return r;
}
