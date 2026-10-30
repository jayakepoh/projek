export default async function run(page) {
  // Minimal repro lewat inline script: hls.js loadSource('/proxy?...') SAJA tanpa xhrSetup.
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const s = document.createElement('script');
    s.textContent = `
      document.title = 'RUN';
      const hls = new window.Hls();
      const finish = (m) => { document.title = m; try { hls.destroy(); } catch {} };
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => finish('RESULT:ok levels=' + (hls.levels?.length||0)));
      hls.on(window.Hls.Events.ERROR, (_e, d) => { if (d.fatal) finish('RESULT:fatal ' + d.details + ' | ' + (d.response?.code||'') + ' ' + (d.response?.url||'').slice(0,70)); });
      hls.loadSource('/proxy?url=' + encodeURIComponent('https://video.detik.com/livecnn/smil:cnntv/chunklist_w268557525_b384000_sleng.m3u8'));
      setTimeout(() => { if (document.title === 'RUN') finish('RESULT:timeout'); }, 12000);
    `;
    document.head.appendChild(s);
  });
  await page.waitForFunction(() => document.title.startsWith('RESULT'), null, { timeout: 30000 });
  return await page.title();
}
