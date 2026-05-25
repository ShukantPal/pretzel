import { test } from '@playwright/test';

test('trace pretzel state', async ({ page }) => {
  await page.addInitScript(() => {
    const origSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function(data) {
      console.log('[WS SEND]', String(data));
      return origSend.call(this, data);
    };
    const origAddEventListener = WebSocket.prototype.addEventListener;
    WebSocket.prototype.addEventListener = function(type, listener, options) {
      if (type === 'message') {
        const wrapped = function(event) {
          console.log('[WS RECV]', String(event.data));
          return listener.call(this, event);
        };
        return origAddEventListener.call(this, type, wrapped, options);
      }
      return origAddEventListener.call(this, type, listener, options);
    };
  });

  page.on('console', msg => console.log('[BROWSER]', msg.text()));
  page.on('pageerror', err => console.log('[PAGEERROR]', err.message));

  await page.goto('http://localhost:5173/?role=stage&nickname=DebugStage');
  await page.waitForTimeout(3000);
  console.log('=== initial ===');
  console.log(await page.textContent('body'));
  await page.waitForTimeout(7000);
  console.log('=== after10s ===');
  console.log(await page.textContent('body'));
});
