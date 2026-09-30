// jsdom walkthrough of all 14 screens against a stub SCORM 1.2 API. Asserts
// screen order, correctness-signal tiers, that dPathwayMap and debriefBaselines
// resolve every scenario option, the debrief's five comparison lines, the
// `flagged` extension, the SCORM status sequence across Retry and a replay,
// and that the manifest and module imports match the files the SCO loads.
import { JSDOM } from "jsdom";
import { readFileSync, existsSync } from "node:fs";

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
const answeredStatements = [];
const origConsoleInfo = console.info;
console.info = (...args) => {
  if (args[0] === "[xapi:local]" && args[1] === "answered") answeredStatements.push(args[2]);
  origConsoleInfo(...args);
};
const origConsoleError = console.error;
console.error = (...args) => {
  errors.push(args.map(String).join(" "));
  origConsoleError(...args);
};

const { screens, totalScreens, dPathwayMap, debriefBaselines } = await import("./src/data.js");
const { init } = await import("./src/appShell.js?v=20260907a");

const assert = (cond, msg) => {
  if (!cond) throw new Error("ASSERTION FAILED: " + msg);
  console.log("  ok — " + msg);
};

assert(totalScreens === 14, `totalScreens is 14 (got ${totalScreens})`);
assert(screens.map((s) => s.id).every((id, i) => id === i + 1), "screen ids are sequential 1-14");
assert(!screens.some((s) => "scored" in s), "no screen carries a `scored` field");
assert(!screens.some((s) => "hardFailOptions" in s), "no screen carries a `hardFailOptions` key");
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

// Files the SCO loads: the import graph from app.js, the entry page and
// stylesheet, and every icon and illustration data.js names. The manifest
// lists exactly these, and each module is imported under one specifier.
{
  const importRe = /from\s+"(\.[^"]+)"/g;
  const specifiersByModule = {};
  const modules = new Set(["app.js"]);
  const queue = ["app.js"];
  while (queue.length) {
    const file = queue.shift();
    const dir = file.includes("/") ? file.slice(0, file.lastIndexOf("/") + 1) : "";
    for (const [, specifier] of readFileSync(file, "utf8").matchAll(importRe)) {
      const target = new URL(specifier.split("?")[0], "file:///" + dir).pathname.slice(1);
      (specifiersByModule[target] ??= new Set()).add(specifier);
      if (!modules.has(target)) { modules.add(target); queue.push(target); }
    }
  }
  for (const [target, specifiers] of Object.entries(specifiersByModule)) {
    assert(specifiers.size === 1, `${target} is imported under one specifier (got ${[...specifiers].join(", ")})`);
    assert([...specifiers][0].includes("?v="), `${target} import carries a ?v= token`);
  }
  const dataSource = readFileSync("src/data.js", "utf8");
  const named = (field, dir) => [...dataSource.matchAll(new RegExp(`${field}: "([^"]+)"`, "g"))].map((m) => `${dir}${m[1]}`);
  const expected = ["index.html", "styles.css", ...modules, ...named("icon", "assets/icons/"), ...named("illustration", "assets/illustrations/")];
  const listed = [...readFileSync("imsmanifest.xml", "utf8").matchAll(/<file href="([^"]+)"/g)].map((m) => m[1]);
  const missing = [...new Set(expected)].filter((f) => !listed.includes(f)).sort();
  const extra = listed.filter((f) => !expected.includes(f)).sort();
  assert(missing.length === 0, `manifest lists every file the SCO loads (missing: ${missing.join(", ") || "none"})`);
  assert(extra.length === 0, `manifest lists nothing the SCO does not load (extra: ${extra.join(", ") || "none"})`);
  assert(listed.every((f) => existsSync(f)), "every manifest file exists on disk");
}

// Stub SCORM 1.2 API so scorm.js takes its active path and the run records
// every status the module sends and whether it finishes the session.
const scormCalls = [];
dom.window.API = {
  LMSInitialize: () => "true",
  LMSSetValue: (key, value) => { scormCalls.push(["set", key, value]); return "true"; },
  LMSCommit: () => "true",
  LMSFinish: () => { scormCalls.push(["finish"]); return "true"; },
};
const lessonStatuses = () => scormCalls.filter((c) => c[0] === "set" && c[1] === "cmi.core.lesson_status").map((c) => c[2]);

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

assert(currentSection().className.includes("screen--splash"), "Screen 1 mounts as splash");
assert(document.getElementById("progress").textContent === "", "no progress indicator on splash");
clickButton(".btn-continue");

assert(currentSection().querySelector("h1").textContent.includes("What is Online Bystander"), "Screen 2 is Introduction");
clickButton(".btn-continue");

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

// Best-fit pick (Direct)
submitScenario(4, "A");
checkPhaseCard(5, "Direct");

// A non-best-fit pick (Distract) exercises the "A missed opportunity" tier
// and shows the debrief reflects the pick, not the key.
submitScenario(6, "A");
checkPhaseCard(7, "Distract");

// Best-fit pick (Delegate)
submitScenario(8, "C");
checkPhaseCard(9, "Delegate");

// Best-fit pick (Document)
submitScenario(10, "B");
checkPhaseCard(11, "Document");

// The "defensible" tier (B), not the outright best-fit (A)
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
  const flaggedKey = (st) => Object.keys(st.context.extensions).find((k) => k.endsWith("/extensions/flagged"));
  assert(answeredStatements.length === 5, `5 answered statements sent (got ${answeredStatements.length})`);
  assert(answeredStatements.every((st) => !flaggedKey(st)), "answered statements for unflagged picks carry no flagged extension");
  console.log("  Debrief lines:");
  lines.forEach((l) => console.log("   - " + l));

  clickButton(".debrief-actions .debrief-retry");
  assert(currentSection().className.includes("screen--splash"), "Retry returns to Screen 1 splash");
  assert(document.getElementById("progress").textContent === "", "progress indicator clears again after Retry");
}

// Second run after Retry, starting with a flagOptions pick (screen 4, option C).
const statusesAfterFirstRun = lessonStatuses();
assert(statusesAfterFirstRun.at(-1) === "completed", `first run ends with lesson_status "completed" (got ${statusesAfterFirstRun})`);
clickButton(".btn-continue");
clickButton(".btn-continue");
clickButton(".btn-continue");
submitScenario(4, "C");
{
  const st = answeredStatements[answeredStatements.length - 1];
  const key = Object.keys(st.context.extensions).find((k) => k.endsWith("/extensions/flagged"));
  assert(st.result.response === "C" && key && st.context.extensions[key] === true, "answered statement for a flagOptions pick carries flagged: true");
}
checkPhaseCard(5, "Direct");
submitScenario(6, "A");
checkPhaseCard(7, "Distract");
submitScenario(8, "C");
checkPhaseCard(9, "Delegate");
submitScenario(10, "B");
checkPhaseCard(11, "Document");
submitScenario(12, "B");
checkPhaseCard(13, "Delay");
assert(currentSection().className.includes("screen--debrief"), "second run reaches the debrief");
assert(!lessonStatuses().slice(statusesAfterFirstRun.length).includes("incomplete"), "replay after Retry sends no lesson_status \"incomplete\"");
assert(lessonStatuses().at(-1) === "completed", `lesson_status still ends \"completed\" after the replay (got ${lessonStatuses()})`);
dom.window.dispatchEvent(new dom.window.Event("beforeunload"));
assert(scormCalls.filter((c) => c[0] === "finish").length === 1, "unload after a Retry replay still finishes the SCORM session");

console.log(`\n${errors.length === 0 ? "PASS" : "FAIL"} — ${errors.length} console.error call(s) during the walkthrough.`);
if (errors.length) {
  errors.forEach((e) => console.log("  ERROR:", e));
  process.exit(1);
}
console.log("All assertions passed.");
