export default async function run(page) {
  await page.addInitScript(() => {
    window.__opens = [];
    const orig = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (m, u, ...rest) {
      window.__opens.push(String(u).slice(0, 120));
      return orig.call(this, m, u, ...rest);
    };
  });
  await page.goto('http://localhost:4173/?nocache=' + Date.now(), { waitUntil: 'domcontentloaded' });
  // Verify the loaded script source contains startXhrHls by fetching it in-page.
  const src = await page.evaluate(async () => {
    const t = await (await fetch('/app.js?v=4')).text();
    return { hasNew: t.includes('startXhrHls'), len: t.length };
  });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
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
  const opens = await page.evaluate(() => (window.__opens || []).slice(0, 15));
  return { src, opens };
}
