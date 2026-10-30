export default async function run(page) {
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

  const requests = [];
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('detik')) requests.push(u.slice(0, 105));
  });
  await page.evaluate(() => {
    const input = document.querySelector('#search-input');
    input.value = 'CNN Indonesia';
    input.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#channel-list .channel-row')?.click());
  await page.waitForTimeout(16000);
  const v = await page.evaluate(() => {
    const video = document.querySelector('#video-player');
    return { t: +video.currentTime.toFixed(1), ready: video.readyState };
  });
  return { requests: [...new Set(requests)].slice(0, 10), v };
}
