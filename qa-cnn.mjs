export default async function run(page, ui) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.evaluate(() => document.querySelector('#manage-sources').click());
  await page.waitForTimeout(300);
  await page.locator('#playlist-file').setInputFiles('channels-clean.m3u');
  await page.waitForFunction(() => document.querySelector('#channel-count').textContent !== '0 kanal', null, { timeout: 5000 });

  for (const name of ['CNN Indonesia', 'VTV (Indonesia) (720p)']) {
    await page.evaluate((n) => {
      const input = document.querySelector('#search-input');
      input.value = n;
      input.dispatchEvent(new Event('input'));
    }, name);
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector('#channel-list .channel-row')?.click());
    await page.waitForTimeout(15000);
    const state = await page.evaluate(() => {
      const v = document.querySelector('#video-player');
      return { t: +v.currentTime.toFixed(1), ready: v.readyState };
    });
    console.error(`${name}: t=${state.t} ready=${state.ready}`);
  }
  return 'done';
}
