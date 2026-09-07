// appShell.js — AppShell (C0). Single-screen-visible container, linear
// advance, tracking-init-before-first-render, owns app-level state.
// Per Component Architecture Spec v1.3 §AppShell (still describes the old
// 11-screen scheme as of this rebuild — sweep pending).

import { screens, totalScreens, dPathwayMap, debriefBaselines } from "./data.js?v=20260907a";
import { renderScreen, formatPercent } from "./render.js?v=20260907a";
import {
  trackInitialized,
  trackAnswered,
  trackScreenCompleted,
  trackHintOpened,
  trackReferenceOpened,
  trackModuleCompleted,
} from "./xapi.js?v=20260907a";
import { scormInit, scormSetIncomplete, scormSetCompleted, scormTerminate } from "./scorm.js?v=20260907a";

// Dev navigation shortcut — gated at runtime, never shippable by default.
// Structurally absent on the deployed GitHub Pages domain; no build step
// needed to strip it.
const DEV_NAV_ENABLED = ["localhost", "127.0.0.1"].includes(window.location.hostname);

function initialState() {
  return {
    currentScreenIndex: 0,
    completedScreens: new Set(),
    // Renamed from hardFailFlags (2026-09-07 rebuild) — same signal, new
    // name to match the diagnostic model: no pass/fail exists, but this
    // still records whether a flagged option (escalating without the
    // affected person's consent, per FDD A6) was ever selected. Kept
    // internal/xAPI-only, never learner-visible — Johar's call.
    flagHistory: {}, // screenId -> bool, any-submission (not just first) —
    // same conservative read as before: a signal meant to surface a risk
    // pattern shouldn't disappear because a later retry got it right.
    answeredOnce: new Set(), // screenIds that have fired their F3 `completed` statement
    // NEW 2026-09-07 — the learner's first-submitted option per scenario
    // screen, needed for the debrief's per-scenario "You and X%..." line.
    // First submission only, same rationale as answeredOnce: a screen
    // reached again via Back shouldn't silently overwrite what the debrief
    // will show, even though (pre-existing behavior, unchanged here) the
    // visual answer-lock itself doesn't persist across a remount.
    selections: {}, // screenId -> optionId
    scormActive: false,
    moduleCompleted: false, // guards F6 firing more than once per registration
  };
}

let state = initialState();

const appEl = document.getElementById("app");
const progressEl = document.getElementById("progress");

function updateProgress() {
  // The splash screen shows no progress indicator — "Screen 1 of 14" reads
  // wrong above a title/Start screen.
  if (screens[state.currentScreenIndex].variant === "splash") {
    progressEl.textContent = "";
    return;
  }
  const n = state.currentScreenIndex + 1;
  progressEl.textContent = `Screen ${n} of ${totalScreens}`;
}

// Builds the debrief's five comparison lines from what the learner actually
// picked (state.selections), not always the best-fit option — the debrief
// validates whatever the learner chose, per Johar's framing (2026-09-01):
// real percentages, no bucketing, "designed to create the illusion of
// dynamic choice." Under the normal linear flow every scenario screen is
// answered before Continue appears, so all five ids resolve; the null
// guard only covers an unreachable-in-practice edge (module reloaded mid-
// way — no persistence, so this can't actually happen without a fresh
// registration anyway).
const SCENARIO_SCREEN_IDS = [4, 6, 8, 10, 12];
function buildComparisonLines() {
  return SCENARIO_SCREEN_IDS.map((screenId) => {
    const chosen = state.selections[screenId];
    const baseline = debriefBaselines[screenId];
    const opt = chosen && baseline ? baseline.options[chosen] : null;
    if (!opt) return null;
    return `You and ${formatPercent(opt.percent)} of people chose to ${opt.choice} when ${baseline.situation}.`;
  }).filter(Boolean);
}

function mountScreen(index) {
  const screen = screens[index];
  appEl.innerHTML = "";

  // F6 — fires once, on arrival at the debrief screen (matches xapi.js's
  // own doc comment: "learner reaches the Debrief screen"), not on a
  // button click. This also decouples completion tracking from the
  // Retry/Exit buttons below — either one is available after the module is
  // already marked complete.
  if (screen.variant === "debrief" && !state.moduleCompleted) {
    state.moduleCompleted = true;
    trackModuleCompleted();
    if (state.scormActive) scormSetCompleted();
  }

  // Debrief's comparison lines are computed fresh on every mount (Retry
  // clears state.selections, so a second pass produces new lines) rather
  // than stored in data.js. The canonical screen object is never mutated —
  // a shallow clone is what's passed to renderScreen.
  const screenToRender =
    screen.variant === "debrief"
      ? { ...screen, data: { ...screen.data, comparisonLines: buildComparisonLines() } }
      : screen;

  const ctx = {
    canGoBack: index > 0 && state.completedScreens.has(screens[index - 1]?.id),
    onBack: () => goTo(index - 1),
    onAdvance: () => {
      state.completedScreens.add(screen.id);
      goTo(index + 1);
    },
    onRetry: () => {
      state = initialState();
      state.moduleCompleted = true; // already fired once this registration; don't refire on replay
      goTo(0);
    },
    onSubmit: (screenId, scenarioInstance, optionId) => {
      trackAnswered(screenId, scenarioInstance, optionId);

      const flagOptions = screen.flagOptions || [];
      if (flagOptions.includes(optionId)) {
        state.flagHistory[screenId] = true;
      }

      if (!(screenId in state.selections)) {
        state.selections[screenId] = optionId;
      }

      if (!state.answeredOnce.has(screenId)) {
        state.answeredOnce.add(screenId);
        const dPathway = dPathwayMap[screenId]?.[optionId];
        trackScreenCompleted(screenId, scenarioInstance, dPathway);
        if (state.scormActive) scormSetIncomplete();
      }
    },
    onHintOpen: () => trackHintOpened(),
    onReferenceOpen: (fromScreenId) => trackReferenceOpened(fromScreenId),
  };

  let node;
  try {
    node = renderScreen(screenToRender, ctx);
  } catch (err) {
    console.error("[appShell] mount failed", err);
    appEl.innerHTML = "";
    appEl.appendChild(
      Object.assign(document.createElement("p"), {
        className: "mount-error",
        textContent:
          "Something went wrong loading this screen. Please reload the page to try again.",
      })
    );
    return;
  }

  appEl.appendChild(node);
  updateProgress();

  // Focus moves to the new screen's heading/container on every transition.
  node.focus();

  if (DEV_NAV_ENABLED) mountDevNav(index);
}

function goTo(index) {
  if (index < 0 || index >= totalScreens) return;
  state.currentScreenIndex = index;
  mountScreen(index);
}

function mountDevNav(index) {
  let bar = document.getElementById("dev-nav");
  if (bar) bar.remove();
  bar = document.createElement("div");
  bar.id = "dev-nav";
  bar.style.cssText =
    "position:fixed;bottom:0;left:0;right:0;background:#222;color:#fff;font:12px monospace;padding:6px;display:flex;gap:4px;flex-wrap:wrap;z-index:999;";
  screens.forEach((s, i) => {
    const btn = document.createElement("button");
    btn.textContent = s.id;
    btn.style.cssText =
      "background:" + (i === index ? "#A0596A" : "#444") + ";color:#fff;border:none;padding:2px 6px;cursor:pointer;";
    btn.addEventListener("click", () => goTo(i));
    bar.appendChild(btn);
  });
  document.body.appendChild(bar);
}

export function init() {
  trackInitialized();
  state.scormActive = scormInit();
  window.addEventListener("beforeunload", () => {
    if (state.scormActive) scormTerminate();
  });
  goTo(0);
}
