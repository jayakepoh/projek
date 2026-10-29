export default async function run(page) {
  // Muat app.js yang sama seperti browser, dan periksa apakah startXhrHls dipanggil.
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    regs.forEach(r => r.unregister());
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  });
  await page.reload();
  await page.evaluate(() => document.querySelector('#manage-sources').click());
  await page.waitForTimeout(300);
  await page.locator('#playlist-file').setInputFiles('channels-clean.m3u');
  await page.waitForFunction(() => document.querySelector('#channel-count').textContent !== '0 kanal', null, { timeout: 5000 });

  // Patch console untuk melacak alur di dalam playChannel.
  await page.evaluate(() => {
    window.__trace = [];
    const origError = console.error;
    console.error = (...a) => { window.__trace.push(a.map(String).join(' ').slice(0, 100)); origError(...a); };
  });

  await page.evaluate(() => {
    const input = document.querySelector('#search-input');
    input.value = 'CNN Indonesia';
    input.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#channel-list .channel-row')?.click());
  await page.waitForTimeout(12000);
  return await page.evaluate(() => ({
    trace: window.__trace,
    status: document.querySelector('#player-status').textContent,
  }));
}
