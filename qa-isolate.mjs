export default async function run(page) {
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  return await page.evaluate(async () => {
    if (!window.Hls) return 'no Hls after load';
    const opened = [];
    const hls = new Hls({
      xhrSetup: (xhr, url) => {
        opened.push(url.slice(0, 90));
        xhr.open('GET', '/proxy?url=' + encodeURIComponent(url), true);
      },
    });
    hls.loadSource('https://video.detik.com/livecnn/smil:cnntv/chunklist_w268557525_b384000_sleng.m3u8');
    await new Promise((res) => {
      hls.on(Hls.Events.MANIFEST_PARSED, res);
      hls.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) res(); });
      setTimeout(res, 12000);
    });
    const levels = hls.levels?.length || 0;
    hls.destroy();
    return { opened, levels };
  });
}
