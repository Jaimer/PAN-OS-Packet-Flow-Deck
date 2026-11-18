import { expect, test } from '@playwright/test';

test.describe('PAN-OS Packet Flow Educational Deck', () => {
  test('navigates slides, handles invalid hashes, keyboard shortcuts, modals, and notes', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    // Invalid hash falls back cleanly to Slide 1
    await page.goto('/#slide-999');
    await expect(page.getByTestId('slide-1')).toBeVisible();
    await expect(page.getByTestId('slide-counter')).toHaveText('1 / 12');
    await expect(page.getByTestId('prev-slide-btn')).toBeDisabled();

    // Next button & URL hash sync
    await page.getByTestId('next-slide-btn').click();
    await expect(page.getByTestId('slide-2')).toBeVisible();
    await expect(page.getByTestId('slide-counter')).toHaveText('2 / 12');
    await expect(page).toHaveURL(/#slide-2$/);

    // Keyboard navigation: ArrowLeft -> Slide 1, ArrowRight -> Slide 2
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('slide-1')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('slide-2')).toBeVisible();

    // Notes drawer toggle ('N')
    await page.keyboard.press('n');
    await expect(page.getByTestId('notes-drawer')).toBeVisible();
    await page.keyboard.press('n');
    await expect(page.getByTestId('notes-drawer')).toHaveCount(0);

    // Overview modal ('O') -> jump to Slide 5 -> closes
    await page.keyboard.press('o');
    await expect(page.getByTestId('overview-modal')).toBeVisible();
    await page.getByTestId('overview-slide-5').click();
    await expect(page.getByTestId('overview-modal')).toHaveCount(0);
    await expect(page.getByTestId('slide-5')).toBeVisible();

    // Shortcuts modal ('?') & Esc closes
    await page.keyboard.press('?');
    await expect(page.getByTestId('shortcuts-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('shortcuts-modal')).toHaveCount(0);

    // Presentation vs Interactive Mode toggle ('I')
    await page.keyboard.press('i');
    await expect(page.getByTestId('mode-toggle-btn')).toContainText('Presentation Mode');
    await page.keyboard.press('i');
    await expect(page.getByTestId('mode-toggle-btn')).toContainText('Interactive Mode');

    expect(errors).toEqual([]);
  });

  test('animates scenarios, stepping, loop-backs, and drop exits on Slide 2', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/#slide-2');
    await expect(page.getByTestId('packet-token')).toBeVisible();
    await expect(page.getByTestId('sim-step-counter')).toHaveText('Step 1 / 8');

    // Step forward & step back
    await page.getByTestId('step-forward-btn').click();
    await expect(page.getByTestId('sim-step-counter')).toHaveText('Step 2 / 8');
    await expect(page.getByTestId('step-title')).toContainText('Slowpath 3.1–3.5');

    await page.getByTestId('step-back-btn').click();
    await expect(page.getByTestId('sim-step-counter')).toHaveText('Step 1 / 8');

    // Scenario 3: IPSec Tunnel Decap loop
    await page.getByTestId('scenario-tab-ipsec-tunnel').click();
    await page.getByTestId('step-forward-btn').click();
    await expect(page.getByTestId('step-title')).toContainText('Tunnel Decap');

    // Scenario 5: Dropped / Fault Packet
    await page.getByTestId('scenario-tab-dropped-fault').click();
    await page.getByTestId('step-forward-btn').click();
    await expect(page.getByTestId('drop-reason-banner')).toContainText('flow_rcv_dot1q_tag_err');

    // Scenario 6: SSL Decryption + App-ID Shift
    await page.getByTestId('scenario-tab-ssl-decrypt-appid-shift').click();
    await page.getByTestId('step-forward-btn').click();
    await page.getByTestId('step-forward-btn').click();
    await expect(page.getByTestId('step-title')).toContainText('youtube');

    // Reduced Motion toggle
    await page.getByTestId('reduced-motion-btn').click();
    await expect(page.getByTestId('deck-shell')).toHaveClass(/reduced-motion/);

    expect(errors).toEqual([]);
  });

  test('verifies interactive educational widgets (D1–D6) and keyboard input isolation', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    // Slide 5: D2 Matrix + D1 6-Tuple Explorer
    await page.goto('/#slide-5');
    await page.getByTestId('toggle-multicast-fw').click();
    await expect(
      page.getByTestId('matrix-cell-Virtual-Wire-IPv4-Multicast')
    ).toHaveText('Inspect & Forward');

    await page.getByTestId('proto-btn-ICMP').click();
    await expect(page.getByTestId('tuple-box-C2S')).toContainText('ID:0x1a2b');

    // Typing Space in an input does NOT advance slide
    const firstInput = page.getByTestId('widget-six-tuple').locator('input').first();
    await firstInput.focus();
    await page.keyboard.press(' ');
    await expect(page.getByTestId('slide-5')).toBeVisible();

    // Slide 6: D3 SYN Cookies + Allow Non-SYN warning
    await page.goto('/#slide-6');
    await page.getByTestId('toggle-allow-nonsyn').click();
    await expect(page.getByTestId('nonsyn-warning')).toBeVisible();

    // Slide 8: D6 Slowpath PAN-48644 + D4 Session Lifecycle
    await page.goto('/#slide-8');
    await page.getByTestId('toggle-pan48644').click();
    await page.getByTestId('lc-alloc').click();
    await page.getByTestId('lc-install').click();
    await expect(page.getByTestId('lifecycle-state-ACTIVE')).toHaveClass(/active/);
    await page.getByTestId('lc-deny').click();
    await expect(page.getByTestId('lifecycle-state-DISCARD')).toHaveClass(/active/);

    expect(errors).toEqual([]);
  });

  test('renders cleanly without horizontal overflow across responsive viewports', async ({
    page,
  }) => {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
      { width: 768, height: 1024 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.goto('/#slide-2');
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(overflow).toBe(false);
    }
  });

  test('traps Tab and Shift+Tab focus inside Overview and Shortcuts modals', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/#slide-1');

    // Overview modal: 22 forward Tabs + 5 Shift+Tabs stay trapped inside overview-modal
    await page.getByTestId('overview-btn').click();
    const overviewModal = page.getByTestId('overview-modal');
    await expect(overviewModal).toBeVisible();

    for (let i = 0; i < 22; i++) {
      await page.keyboard.press('Tab');
      const inside = await overviewModal.evaluate((el) => el.contains(document.activeElement));
      expect(inside).toBe(true);
    }
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Shift+Tab');
      const inside = await overviewModal.evaluate((el) => el.contains(document.activeElement));
      expect(inside).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(overviewModal).toHaveCount(0);
    await expect(page.getByTestId('overview-btn')).toBeFocused();

    // Shortcuts modal: 22 forward Tabs + 5 Shift+Tabs stay trapped inside shortcuts-modal
    await page.getByTestId('shortcuts-btn').click();
    const shortcutsModal = page.getByTestId('shortcuts-modal');
    await expect(shortcutsModal).toBeVisible();

    for (let i = 0; i < 22; i++) {
      await page.keyboard.press('Tab');
      const inside = await shortcutsModal.evaluate((el) => el.contains(document.activeElement));
      expect(inside).toBe(true);
    }
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Shift+Tab');
      const inside = await shortcutsModal.evaluate((el) => el.contains(document.activeElement));
      expect(inside).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(shortcutsModal).toHaveCount(0);
    await expect(page.getByTestId('shortcuts-btn')).toBeFocused();

    expect(errors).toEqual([]);
  });

  test('clicks all 4 loop-back arcs on Slide 2 and updates stage-detail-box', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/#slide-2');
    const loopArcs = page.locator('g[aria-label^="Loop-back arc:"]');
    await expect(loopArcs).toHaveCount(4);

    const detailBox = page.locator('.stage-detail-box');
    for (let i = 0; i < 4; i++) {
      const arc = loopArcs.nth(i);
      const label = await arc.getAttribute('aria-label');
      const expectedTitle = label?.replace('Loop-back arc: ', '') ?? '';
      await arc.click();
      await expect(detailBox).toContainText(`Loop-Back: ${expectedTitle}`);
    }

    expect(errors).toEqual([]);
  });
});
