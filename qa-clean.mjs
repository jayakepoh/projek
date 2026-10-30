export default async function run(page, ui) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.evaluate(() => document.querySelector('#manage-sources').click());
  await page.waitForTimeout(300);
  await page.locator('#playlist-file').setInputFiles('channels-clean.m3u');
  await page.waitForFunction(() => document.querySelector('#channel-count').textContent !== '0 kanal', null, { timeout: 5000 });

  // Sample 6 kanal acak-ish dari playlist bersih dan coba putar.
  const names = await page.evaluate(() => {
    const all = [...document.querySelectorAll('#channel-list .channel-row strong')].map(e => e.textContent);
    return [all[0], all[30], all[60], all[90], all[111], 'CNN Indonesia'];
  });
  const report = [];
  for (const name of names) {
    if (!name) continue;
    await page.evaluate((n) => {
      const input = document.querySelector('#search-input');
      input.value = n;
      input.dispatchEvent(new Event('input'));
    }, name);
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector('#channel-list .channel-row')?.click());
    await page.waitForTimeout(9000);
    const state = await page.evaluate(() => {
      const v = document.querySelector('#video-player');
      return {
        t: v.currentTime,
        ready: v.readyState,
        status: document.querySelector('#player-status').hidden ? null
          : document.querySelector('#player-status').textContent,
      };
    });
    report.push({ name, verdict: state.t > 1 ? 'PLAYING' : state.t > 0 ? 'STARTING' : 'FAIL', t: +state.t.toFixed(1) });
  }
  return { total: report.length, playing: report.filter(r => r.verdict !== 'FAIL').length, report };
}
