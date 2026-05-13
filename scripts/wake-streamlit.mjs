import { chromium } from "playwright";

const appUrl = process.env.STREAMLIT_APP_URL || "https://my-ats-007.streamlit.app/";
const timeoutMs = Number(process.env.STREAMLIT_WAKE_TIMEOUT_MS || 120000);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1366, height: 900 },
  userAgent:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 portfolio-keepalive/1.0",
});

page.setDefaultTimeout(30000);

try {
  console.log(`streamlit-browser: opening ${appUrl}`);
  await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  await settle(page, 5000);

  await clickWakeButtonIfPresent(page);
  await waitForAppOrAuthFlow(page, timeoutMs);

  const title = await page.title();
  const finalUrl = page.url();
  const bodyText = await visibleText(page);

  console.log(`streamlit-browser: final url ${finalUrl}`);
  console.log(`streamlit-browser: title ${title || "not found"}`);
  console.log(`streamlit-browser: visible text ${trimForLog(bodyText)}`);

  if (!finalUrl.includes("my-ats-007.streamlit.app")) {
    throw new Error(`Streamlit did not return to the app domain. Final URL: ${finalUrl}`);
  }
} finally {
  await browser.close();
}

async function clickWakeButtonIfPresent(page) {
  const candidates = [
    page.getByRole("button", { name: /yes,? get this app back up/i }),
    page.getByRole("button", { name: /get this app back up/i }),
    page.getByRole("button", { name: /wake/i }),
    page.getByText(/yes,? get this app back up/i),
  ];

  for (const candidate of candidates) {
    const count = await candidate.count().catch(() => 0);
    if (!count) continue;

    console.log("streamlit-browser: wake button found, clicking");
    await candidate.first().click({ timeout: 10000 });
    await settle(page, 10000);
    return;
  }

  console.log("streamlit-browser: no wake button visible");
}

async function waitForAppOrAuthFlow(page, timeoutMs) {
  const startedAt = Date.now();
  let lastUrl = page.url();

  while (Date.now() - startedAt < timeoutMs) {
    const currentUrl = page.url();
    const text = await visibleText(page);

    if (currentUrl.includes("my-ats-007.streamlit.app") && !/get this app back up/i.test(text)) {
      await settle(page, 3000);
      return;
    }

    if (currentUrl !== lastUrl) {
      console.log(`streamlit-browser: navigated to ${currentUrl}`);
      lastUrl = currentUrl;
    }

    await clickWakeButtonIfPresent(page);
    await settle(page, 3000);
  }
}

async function visibleText(page) {
  return page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
}

async function settle(page, ms) {
  await page.waitForTimeout(ms);
}

function trimForLog(value) {
  return (value || "").replace(/\s+/g, " ").trim().slice(0, 500) || "not found";
}
