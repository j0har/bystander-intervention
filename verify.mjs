// Scripted walkthrough — mirrors the original Row 7 verification method
// (jsdom, no real browser available in this sandbox). Mounts the app,
// walks all 14 screens end to end, submits every scenario, and asserts the
// rebuild's core claims: screen count/order, correctness-signal tiers,
// flagOptions/dPathwayMap resolve for every scenario id, and the debrief
// renders exactly 5 real-percentage comparison lines built from what was
// actually picked.
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

const errors = [];
const dom = new JSDOM(
  `<!doctype html><html><body>
    <div class="progress-indicator" id="progress"></div>
    <main id="app"></main>
  </body></html>`,
  { url: "http://localhost/index.html", runScripts: "outside-only", pretendToBeVisual: true }
);

global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
// Node 22 already has global.crypto (randomUUID) — nothing to shim.
const origConsoleError = console.error;
console.error = (...args) => {
  errors.push(args.map(String).join(" "));
  origConsoleError(...args);
};

const { screens, totalScreens, dPathwayMap, debriefBaselines } = await import("./src/data.js");
const { init } = await import("./src/appShell.js?v=20260907a");

// --- Structural assertions on data.js, before even mounting -------------
const assert = (cond, msg) => {
  if (!cond) throw new Error("ASSERTION FAILED: " + msg);
  console.log("  ok — " + msg);
};

assert(totalScreens === 14, `totalScreens is 14 (got ${totalScreens})`);
assert(screens.map((s) => s.id).every((id, i) => id === i + 1), "screen ids are sequential 1-14");
assert(!screens.some((s) => "scored" in s), "no screen carries the old `scored` field");
assert(!screens.some((s) => "hardFailOptions" in s), "no screen carries the old `hardFailOptions` name");
const scenarioIds = screens.filter((s) => s.component === "ScenarioScreen").map((s) => s.id);
assert(JSON.stringify(scenarioIds) === JSON.stringify([4, 6, 8, 10, 12]), `scenario screens are 4,6,8,10,12 (got ${scenarioIds})`);
const phaseCardIds = screens.filter((s) => s.component === "PhaseCardScreen").map((s) => s.id);
assert(JSON.stringify(phaseCardIds) === JSON.stringify([5, 7, 9, 11, 13]), `phase-card screens are 5,7,9,11,13 (got ${phaseCardIds})`);
for (const sid of scenarioIds) {
  assert(dPathwayMap[sid], `dPathwayMap has an entry for screen ${sid}`);
  assert(debriefBaselines[sid], `debriefBaselines has an entry for screen ${sid}`);
  const screen = screens.find((s) => s.id === sid);
  for (const opt of screen.data.options) {
    assert(dPathwayMap[sid][opt.id] !== undefined, `dPathwayMap[${sid}] resolves option ${opt.id}`);
    assert(debriefBaselines[sid].options[opt.id] !== undefined, `debriefBaselines[${sid}] resolves option ${opt.id}`);
  }
  // percentages sum to 100 (within float rounding)
  const sum = Object.values(debriefBaselines[sid].options).reduce((a, o) => a + o.percent, 0);
  assert(Math.abs(sum - 100) < 0.2, `screen ${sid} baseline percentages sum to ~100 (got ${sum})`);
  const keyOptions = screen.data.options.filter((o) => o.correct);
  assert(keyOptions.length === 1, `screen ${sid} has exactly one option marked correct (got ${keyOptions.length})`);
}

// --- Full mounted walkthrough --------------------------------------------
console.log("\nMounting app...");
init();

function currentSection() {
  return document.querySelector("#app section");
}

function clickButton(selector) {
  const btn = document.querySelector(selector);
  if (!btn) throw new Error(`ASSERTION FAILED: button not found: ${selector}`);
  btn.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
}

// Screen 1 — splash
assert(currentSection().className.includes("screen--splash"), "Screen 1 mounts as splash");
assert(document.getElementById("progress").textContent === "", "no progress indicator on splash");
clickButton(".btn-continue");

// Screen 2 — Introduction
assert(currentSection().querySelector("h1").textContent.includes("What is Online Bystander"), "Screen 2 is Introduction");
clickButton(".btn-continue");

// Screen 3 — Power Dynamics
assert(currentSection().querySelector("h1").textContent === "Power Dynamics", "Screen 3 is Power Dynamics");
assert(currentSection().querySelectorAll(".power-question").length === 2, "Screen 3 has 2 power questions");
clickButton(".btn-continue");

const walkedChoices = {}; // screenId -> which option we picked, for later debrief cross-check

function submitScenario(screenId, optionId) {
  const section = currentSection();
  assert(section.className.includes("screen--scenario"), `screen ${screenId} mounts as ScenarioScreen`);
  const radio = section.querySelector(`input[value="${optionId}"]`);
  radio.checked = true;
  section.querySelector("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  walkedChoices[screenId] = optionId;
  const signal = section.querySelector(".feedback__signal");
  assert(signal && signal.textContent.length > 0, `screen ${screenId} shows a correctness-signal label after submit`);
  const stillEnabled = section.querySelectorAll('input[type="radio"]:not(:disabled)').length;
  assert(stillEnabled === 0, `screen ${screenId} locks all radios after submit`);
  assert(section.querySelector(".btn-submit").hidden, `screen ${screenId} hides Submit after submit`);
  clickButton(".continue-holder .btn-continue");
}

function checkPhaseCard(screenId, expectedD) {
  const section = currentSection();
  assert(section.className.includes("screen--phasecard"), `screen ${screenId} mounts as PhaseCardScreen`);
  assert(section.querySelector(".phase-card h2").textContent === expectedD, `screen ${screenId} card is ${expectedD}`);
  assert(section.querySelector(".phase-card__example"), `screen ${screenId} card has an example`);
  clickButton(".btn-continue");
}

// Screen 4 — pick the BEST-FIT option (Direct)
submitScenario(4, "A");
checkPhaseCard(5, "Direct");

// Screen 6 — pick a NON-best-fit option (Distract) — exercises the
// "A missed opportunity" tier and confirms the debrief still reflects
// whatever was actually picked, not always the key.
submitScenario(6, "A");
checkPhaseCard(7, "Distract");

// Screen 8 — best fit (Delegate)
submitScenario(8, "C");
checkPhaseCard(9, "Delegate");

// Screen 10 — best fit (Document)
submitScenario(10, "B");
checkPhaseCard(11, "Document");

// Screen 12 — the "defensible" tier (B), not the outright best-fit (A)
{
  const section = currentSection();
  assert(section.className.includes("screen--scenario"), "screen 12 mounts as ScenarioScreen");
  const radio = section.querySelector('input[value="B"]');
  radio.checked = true;
  section.querySelector("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  walkedChoices[12] = "B";
  const signal = section.querySelector(".feedback__signal");
  assert(signal.textContent === "A reasonable trade-off", `screen 12/B shows the "A reasonable trade-off" tier, got "${signal.textContent}"`);
  clickButton(".continue-holder .btn-continue");
}
checkPhaseCard(13, "Delay");

// Screen 14 — Debrief
{
  const section = currentSection();
  assert(section.className.includes("screen--debrief"), "screen 14 mounts as debrief");
  const lines = [...section.querySelectorAll(".comparison-list li")].map((li) => li.textContent);
  assert(lines.length === 5, `debrief shows exactly 5 comparison lines (got ${lines.length})`);
  for (const [screenId, optionId] of Object.entries(walkedChoices)) {
    const baseline = debriefBaselines[screenId].options[optionId];
    const matching = lines.find((l) => l.includes(baseline.choice));
    assert(!!matching, `debrief line reflects the actual pick for screen ${screenId} (${optionId}: "${baseline.choice}")`);
    assert(matching.includes(String(baseline.percent).replace(/\.0$/, "")) || matching.includes(baseline.percent.toFixed(1)), `debrief line for screen ${screenId} shows its real percentage`);
  }
  console.log("  Debrief lines:");
  lines.forEach((l) => console.log("   - " + l));

  // Retry resets and goes back to Screen 1
  clickButton(".debrief-actions .debrief-retry");
  assert(currentSection().className.includes("screen--splash"), "Retry returns to Screen 1 splash");
  assert(document.getElementById("progress").textContent === "", "progress indicator clears again after Retry");
}

console.log(`\n${errors.length === 0 ? "PASS" : "FAIL"} — ${errors.length} console.error call(s) during the walkthrough.`);
if (errors.length) {
  errors.forEach((e) => console.log("  ERROR:", e));
  process.exit(1);
}
console.log("All assertions passed.");
