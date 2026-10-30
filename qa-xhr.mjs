export default async function run(page) {
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    regs.forEach(r => r.unregister());
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  });
  await page.reload();

  // Instrument langsung: monkey-patch XMLHttpRequest.open agar XHR kedua
  // (manifest kedua yang di-upgrade ke https://video.detik.com/proxy?...) terlihat.
  await page.evaluate(() => {
    window.__opens = [];
    const orig = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (m, u, ...rest) {
      window.__opens.push(String(u).slice(0, 100));
      return orig.call(this, m, u, ...rest);
    };
  });

  await page.evaluate(() => document.querySelector('#manage-sources').click());
  await page.waitForTimeout(300);
  await page.locator('#playlist-file').setInputFiles('channels-clean.m3u');
  await page.waitForFunction(() => document.querySelector('#channel-count').textContent !== '0 kanal', null, { timeout: 5000 });
  await page.evaluate(() => {
    const input = document.querySelector('#search-input');
    input.value = 'CNN Indonesia';
    input.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#channel-list .channel-row')?.click());
  await page.waitForTimeout(14000);
  return await page.evaluate(() => ({ opens: window.__opens.slice(0, 12) }));
}
