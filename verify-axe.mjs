// axe-core pass across all 14 mounted screens — same method/caveat as the
// original Row 7 verification (jsdom, not a real browser; a real-browser
// contrast/axe pass is still owed, per this repo's standing note).
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

// Harness mirrors the real index.html's <html>/<body> structure exactly
// (lang, title, skip-link, aria-hidden progress indicator) so this only
// catches violations the rebuild actually introduces, not artifacts of a
// stripped-down test document.
const dom = new JSDOM(
  `<!doctype html><html lang="en"><head><title>Digital Bystander Intervention</title>
    <style>${readFileSync("./styles.css", "utf8")}</style></head><body>
    <a class="skip-link" href="#app">Skip to content</a>
    <div class="progress-indicator" id="progress" aria-hidden="true"></div>
    <main id="app" aria-live="off"></main>
  </body></html>`,
  { url: "http://localhost/index.html", runScripts: "outside-only", pretendToBeVisual: true }
);
global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
console.error = () => {}; // xapi/scorm local-mode logging is expected noise here

const axeSrc = readFileSync("./node_modules/axe-core/axe.min.js", "utf8");
dom.window.eval(axeSrc);

const { init } = await import("./src/appShell.js?v=20260907a");
init();

function clickButton(selector) {
  document.querySelector(selector).dispatchEvent(new dom.window.Event("click", { bubbles: true }));
}
function submit(optionId) {
  const section = document.querySelector("#app section");
  const radio = section.querySelector(`input[value="${optionId}"]`);
  radio.checked = true;
  section.querySelector("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
}

async function runAxe(label) {
  const results = await dom.window.axe.run(document, {
    // jsdom doesn't compute real layout/paint, so anything relying on it
    // (color-contrast being the main one) is unreliable here — excluded,
    // same caveat this repo has carried since Row 7.
    rules: { "color-contrast": { enabled: false } },
  });
  const v = results.violations;
  console.log(`${label}: ${v.length} violation(s)`);
  v.forEach((x) => console.log("  -", x.id, x.description, "|", x.nodes.length, "node(s)"));
  return v.length;
}

let totalViolations = 0;
totalViolations += await runAxe("Screen 1 (splash)");
clickButton(".btn-continue");
totalViolations += await runAxe("Screen 2 (intro)");
clickButton(".btn-continue");
totalViolations += await runAxe("Screen 3 (power dynamics)");
clickButton(".btn-continue");

const path = [
  [4, "A"], [5, null], [6, "A"], [7, null], [8, "C"], [9, null],
  [10, "B"], [11, null], [12, "B"], [13, null],
];
for (const [id, optionId] of path) {
  totalViolations += await runAxe(`Screen ${id} (pre-submit)`);
  if (optionId) {
    submit(optionId);
    totalViolations += await runAxe(`Screen ${id} (post-submit, feedback visible)`);
    clickButton(".continue-holder .btn-continue");
  } else {
    clickButton(".btn-continue");
  }
}
totalViolations += await runAxe("Screen 14 (debrief)");

console.log(`\n${totalViolations === 0 ? "PASS" : "FAIL"} — ${totalViolations} total violation(s) (color-contrast excluded, see above).`);
process.exit(totalViolations === 0 ? 0 : 1);
