const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("http://localhost:3000", { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector('button[aria-label^="Topic 15:"]');
  await page.waitForTimeout(1000);

  const getTransform = () =>
    page.evaluate(() => {
      const el = [...document.querySelectorAll("div")].find(
        (d) => d.style.transform.includes("scale(") && d.style.transformOrigin === "center center"
      );
      return el ? el.style.transform : null;
    });

  const before = await getTransform();
  await page.click('button[aria-label^="Topic 15:"]');
  await page.waitForTimeout(1200); // staggered pill animations + 0.3s view transition

  const after = await getTransform();
  const keyPointPills = await page.locator('button[aria-label^="Key point"]').count();
  const tileBox = await page.locator('button[aria-label^="Topic 15:"]').boundingBox();
  const vp = await page.locator(".mindmap-viewport").boundingBox();
  const dist = Math.hypot(
    tileBox.x + tileBox.width / 2 - (vp.x + vp.width / 2),
    tileBox.y + tileBox.height / 2 - (vp.y + vp.height / 2)
  );

  // Click the first key-point pill -> notes drawer should open
  await page.locator('button[aria-label="Key point 1 — open topic notes"]').click();
  await page.waitForTimeout(900);
  const drawerVisible = await page.locator("text=Notes & Key Concepts").first().isVisible().catch(() => false);

  console.log(JSON.stringify({
    transformBefore: before,
    transformAfter: after,
    keyPointPills,
    topic15DistFromContainerCenter: Math.round(dist),
    drawerOpenedFromPill: drawerVisible,
  }, null, 2));

  await browser.close();
})().catch((e) => {
  console.error("TEST FAILED:", e.message);
  process.exit(1);
});
