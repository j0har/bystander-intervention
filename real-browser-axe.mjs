// Real-browser axe-core pass across all 14 mounted screens, at both spec
// breakpoints (390 mobile / 1024 desktop, per DBI-Target-UI-Design-Handoff-
// 2026-09-08.md). Closes the standing caveat verify-axe.mjs has carried
// since Row 7 ("jsdom doesn't compute real layout/paint, so color-contrast
// is excluded") — this runs the identical walkthrough in real Chromium via
// Playwright instead, against a real HTTP server (ES modules need one;
// file:// won't do), with the full axe ruleset including color-contrast.
//
// Setup (not committed — same ad hoc-install convention as verify.mjs/
// verify-axe.mjs, per "no bundler, no build step", DBI-Shell-Architecture-
// Session-v1.1.md Decision 2):
//   npm install playwright axe-core
//   npx playwright install chromium   # skip if a system Chromium is
//                                      # already resolvable — see
//                                      # CHROME_PATH below
//   node real-browser-axe.mjs
//
// Set CHROME_PATH to an existing Chromium/Chrome executable to skip
// Playwright's own browser download (useful in a sandboxed environment
// that already ships one, e.g. Claude's cloud workspace).
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const PORT = 8123 + Math.floor(Math.random() * 1000);
const ROOT = process.cwd();
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const urlPath = decodeURIComponent(req.url.split("?")[0]);
      const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
      try {
        const data = await readFile(filePath);
        res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end("not found");
      }
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

const BASE_URL = `http://127.0.0.1:${PORT}/index.html`;
const VIEWPORTS = [
  { name: "390px mobile", width: 390, height: 844 },
  { name: "1024px desktop", width: 1024, height: 900 },
];

const PATH = [
  [4, "A"], [5, null], [6, "A"], [7, null], [8, "C"], [9, null],
  [10, "B"], [11, null], [12, "B"], [13, null],
];

async function clickButton(page, selector) {
  await page.click(selector);
  await page.waitForTimeout(50);
}

async function submit(page, optionId) {
  await page.check(`#app section input[value="${optionId}"]`);
  await page.evaluate(() => {
    document.querySelector("#app section form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  });
  await page.waitForTimeout(80);
}

async function runAxe(page, label, allViolations) {
  const results = await page.evaluate(async () => window.axe.run(document, {}));
  const v = results.violations;
  console.log(`  ${label}: ${v.length} violation(s)`);
  for (const x of v) {
    console.log(`    - [${x.id}] ${x.description} | impact=${x.impact} | ${x.nodes.length} node(s)`);
    for (const n of x.nodes.slice(0, 5)) {
      console.log(`        target: ${JSON.stringify(n.target)}`);
      if (n.failureSummary) console.log(`        ${n.failureSummary.replace(/\n/g, " ")}`);
    }
    allViolations.push({ viewport: label.split(" | ")[0], screen: label.split(" | ")[1], rule: x.id, impact: x.impact, nodes: x.nodes.length });
  }
  return v.length;
}

async function walkthrough(page, viewportLabel, allViolations) {
  let total = 0;
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 15000 });
  await page.addScriptTag({ path: fileURLToPath(new URL("./node_modules/axe-core/axe.min.js", import.meta.url)) });
  await page.waitForSelector("#app section", { timeout: 5000 });

  total += await runAxe(page, `${viewportLabel} | Screen 1 (splash)`, allViolations);
  await clickButton(page, ".btn-continue");
  total += await runAxe(page, `${viewportLabel} | Screen 2 (intro)`, allViolations);
  await clickButton(page, ".btn-continue");
  total += await runAxe(page, `${viewportLabel} | Screen 3 (power dynamics)`, allViolations);
  await clickButton(page, ".btn-continue");

  for (const [id, optionId] of PATH) {
    total += await runAxe(page, `${viewportLabel} | Screen ${id} (pre-submit)`, allViolations);
    if (optionId) {
      await submit(page, optionId);
      total += await runAxe(page, `${viewportLabel} | Screen ${id} (post-submit, feedback visible)`, allViolations);
      await clickButton(page, ".continue-holder .btn-continue");
    } else {
      await clickButton(page, ".btn-continue");
    }
  }
  total += await runAxe(page, `${viewportLabel} | Screen 14 (debrief)`, allViolations);
  return total;
}

const server = await startServer();
const launchOpts = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {};
const browser = await chromium.launch(launchOpts);
const allViolations = [];
let grandTotal = 0;

for (const vp of VIEWPORTS) {
  console.log(`\n=== ${vp.name} (${vp.width}x${vp.height}) ===`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("fonts.googleapis.com")) {
      console.log("  [console.error]", msg.text());
    }
  });
  grandTotal += await walkthrough(page, vp.name, allViolations);
  await context.close();
}

await browser.close();
server.close();

console.log(`\n${grandTotal === 0 ? "PASS" : "FAIL"} — ${grandTotal} total violation(s) across both breakpoints, real Chromium, full ruleset (color-contrast included).`);
if (allViolations.length) {
  console.log("\nSummary by rule:");
  const byRule = {};
  for (const v of allViolations) byRule[v.rule] = (byRule[v.rule] || 0) + 1;
  for (const [rule, count] of Object.entries(byRule)) console.log(`  ${rule}: ${count}`);
}
process.exit(grandTotal === 0 ? 0 : 1);
