export default async function run(page) {
  // Jalankan jaringan CNN via proxy di konteks halaman: manifest + 1 segmen.
  const base = 'https://video.detik.com/livecnn/smil:cnntv/chunklist_w268557525_b384000_sleng.m3u8';
  const manifest = await page.evaluate(async (u) => {
    const res = await fetch('/proxy?url=' + encodeURIComponent(u));
    return { status: res.status, body: await res.text() };
  }, base);
  if (manifest.status !== 200) return { manifest };
  const segLine = manifest.body.split(/\r?\n/).find((line) => {
    const sourceUrl = line.startsWith('/proxy?url=')
      ? new URL(line, page.url()).searchParams.get('url')
      : line;
    return /\.ts(?:$|[?#])/i.test(sourceUrl || '');
  });
  const segUrl = segLine.startsWith('/proxy?url=')
    ? new URL(segLine, page.url()).searchParams.get('url')
    : new URL(segLine, base).href;
  const seg = await page.evaluate(async (u) => {
    try {
      const res = await fetch('/proxy?url=' + encodeURIComponent(u));
      return { status: res.status, bytes: (await res.arrayBuffer()).byteLength };
    } catch (e) { return { error: String(e) }; }
  }, segUrl);
  return { manifestStatus: manifest.status, segUrl, seg };
}
