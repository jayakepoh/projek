export default async function run(page, ui) {
  // Open the import dialog (fixed: use the real button id, not a stale ref)
  await page.evaluate(() => document.querySelector('#manage-sources').click());
  await page.waitForTimeout(300);

  // Set playlist file via the file input
  const fileInput = page.locator('#playlist-file');
  await fileInput.setInputFiles('channels-id.m3u');
  await page.waitForFunction(() => document.querySelector('#channel-count').textContent !== '0 kanal', null, { timeout: 5000 });

  const count = await page.evaluate(() => document.querySelector('#channel-count').textContent);
  const rows = await page.evaluate(() => document.querySelectorAll('#channel-list .channel-row').length);
  const groups = await page.evaluate(() => [...document.querySelectorAll('#group-list .group-button span:first-child')].map(b => b.textContent));
  const dialogOpen = await page.evaluate(() => document.querySelector('#source-dialog').open);

  // Continue: filter to a group, then play the first channel
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('#group-list .group-button')]
      .find(b => b.textContent.includes('News'));
    btn?.click();
  });
  await page.waitForTimeout(300);
  const newsRows = await page.evaluate(() => document.querySelectorAll('#channel-list .channel-row').length);

  await page.evaluate(() => document.querySelector('#channel-list .channel-row')?.click());
  await page.waitForTimeout(4000);
  const playerVisible = await page.evaluate(() => ({
    videoHidden: document.querySelector('#video-player').hidden,
    emptyHidden: document.querySelector('#player-empty').hidden,
    nowTitle: document.querySelector('#now-title').textContent,
    status: document.querySelector('#player-status').hidden ? null : document.querySelector('#player-status').textContent,
    currentTime: document.querySelector('#video-player').currentTime,
  }));
  return { count, rows, dialogOpen, newsRows, playerVisible };
}
