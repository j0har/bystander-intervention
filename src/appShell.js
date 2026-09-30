// One screen visible at a time, linear advance, owns app-level state.
// Tracking initializes before the first render.

import { screens, totalScreens, dPathwayMap, debriefBaselines, phaseCards } from "./data.js?v=20260915d";
import { renderScreen, formatPercent, el } from "./render.js?v=20260930a";
import {
  trackInitialized,
  trackAnswered,
  trackScreenCompleted,
  trackHintOpened,
  trackModuleCompleted,
} from "./xapi.js?v=20260930a";
import { scormInit, scormSetIncomplete, scormSetCompleted, scormTerminate } from "./scorm.js?v=20260907a";

// Dev navigation is enabled only on localhost, so the deployed domain never
// shows it and no build step has to strip it.
const DEV_NAV_ENABLED = ["localhost", "127.0.0.1"].includes(window.location.hostname);

// D order, read from phaseCards' key order so it can't drift from
// render.js's D_ORDER.
const D_ORDER = Object.keys(phaseCards);

function initialState() {
  return {
    currentScreenIndex: 0,
    completedScreens: new Set(),
    answeredOnce: new Set(), // screenIds whose `completed` statement has fired
    // First-submitted option per scenario screen, which the debrief's lines
    // read. First submission only, so Back can't overwrite what it shows.
    selections: {}, // screenId -> optionId
    scormActive: false,
    moduleCompleted: false, // stops the module's `completed` statement firing twice per registration
  };
}

let state = initialState();

const appEl = document.getElementById("app");
const progressEl = document.getElementById("progress");

// Which five-part-track index a screen belongs to (0-4), or null for the
// three framing screens (splash, intro, power dynamics) before the first
// scenario. Debrief (screen 14) is handled separately below — all five
// parts read as complete there, not "current".
function currentDIndex(screen) {
  if (screen.component === "ScenarioScreen") return screen.scenarioNumber - 1;
  if (screen.component === "PhaseCardScreen") return D_ORDER.indexOf(screen.data.d);
  return null;
}

// Persistent header: a back arrow (when there's somewhere to go back to)
// beside a static module title, with the five-part track below. Title and
// track are aria-hidden; the back button is not, since it's a real control.
// Screen readers get their position from each screen's own heading, where
// focus lands on every mount.
//
// The back control lives here rather than per screen so exactly one sits in
// the same place on every non-splash screen.
function updateProgress() {
  const screen = screens[state.currentScreenIndex];
  // The splash screen has no header; a progress indicator above the title
  // reads wrong.
  if (screen.variant === "splash") {
    progressEl.textContent = "";
    return;
  }

  progressEl.innerHTML = "";

  const canGoBack =
    state.currentScreenIndex > 0 &&
    state.completedScreens.has(screens[state.currentScreenIndex - 1]?.id);
  const headerRow = el("div", { class: "app-header__row" }, [
    canGoBack
      ? el(
          "button",
          {
            type: "button",
            class: "app-header__back",
            "aria-label": "Back",
            onclick: () => goTo(state.currentScreenIndex - 1),
          },
          "←"
        )
      : null,
    el("div", { class: "app-header__title", "aria-hidden": "true" }, screens[0].data.headline),
  ]);
  progressEl.appendChild(headerRow);

  const allComplete = screen.variant === "debrief";
  const curIdx = currentDIndex(screen);
  const track = el(
    "div",
    { class: "app-header__track", "aria-hidden": "true" },
    D_ORDER.map((d, i) => {
      const done = allComplete || (curIdx !== null && i < curIdx);
      const current = !allComplete && curIdx === i;
      const cls = ["track-part"];
      if (done) cls.push("track-part--done");
      if (current) cls.push("track-part--current");
      return el("div", {
        class: cls.join(" "),
        style: done || current ? `--part-color: ${phaseCards[d].color}` : "",
      });
    })
  );
  progressEl.appendChild(track);
}

const SCENARIO_SCREEN_IDS = [4, 6, 8, 10, 12];

// Builds the debrief's five lines from what the learner actually picked, with
// the real baseline percentages. Returns one object per line rather than a
// joined string so render.js can pair each with its scenario art and D-color;
// `color` falls back to the neutral text token for an off-framework pick.
function buildComparisonLines() {
  return SCENARIO_SCREEN_IDS.map((screenId) => {
    const chosen = state.selections[screenId];
    const baseline = debriefBaselines[screenId];
    const opt = chosen && baseline ? baseline.options[chosen] : null;
    if (!opt) return null;
    const d = dPathwayMap[screenId]?.[chosen];
    const screen = screens.find((s) => s.id === screenId);
    return {
      percent: formatPercent(opt.percent),
      choice: opt.choice,
      situation: baseline.situation,
      color: d && d !== "off-framework" ? phaseCards[d].color : "var(--color-text-secondary)",
      illustration: screen?.data.illustration,
    };
  }).filter(Boolean);
}

function mountScreen(index) {
  const screen = screens[index];
  appEl.innerHTML = "";

  // The module's `completed` statement fires on arrival at the debrief, not
  // on a button click, since Retry and Exit are both available afterward.
  if (screen.variant === "debrief" && !state.moduleCompleted) {
    state.moduleCompleted = true;
    trackModuleCompleted();
    if (state.scormActive) scormSetCompleted();
  }

  // Debrief's comparison lines are recomputed on every mount (Retry clears
  // state.selections) rather than stored in data.js. The canonical screen
  // object is never mutated — a shallow clone is passed to renderScreen.
  const screenToRender =
    screen.variant === "debrief"
      ? { ...screen, data: { ...screen.data, comparisonLines: buildComparisonLines() } }
      : screen;

  const ctx = {
    onAdvance: () => {
      state.completedScreens.add(screen.id);
      goTo(index + 1);
    },
    onRetry: () => {
      // scormActive describes the launch, not the run, so a replay keeps it.
      const { scormActive } = state;
      state = initialState();
      state.scormActive = scormActive;
      state.moduleCompleted = true; // already fired once this registration; don't refire on replay
      goTo(0);
    },
    onSubmit: (screenId, scenarioInstance, optionId) => {
      const flagged = (screen.flagOptions || []).includes(optionId);
      trackAnswered(screenId, scenarioInstance, optionId, flagged);

      if (!(screenId in state.selections)) {
        state.selections[screenId] = optionId;
      }

      if (!state.answeredOnce.has(screenId)) {
        state.answeredOnce.add(screenId);
        const dPathway = dPathwayMap[screenId]?.[optionId];
        trackScreenCompleted(screenId, scenarioInstance, dPathway);
        // A replay after completion must not move the LMS back to incomplete.
        if (state.scormActive && !state.moduleCompleted) scormSetIncomplete();
      }
    },
    onHintOpen: () => trackHintOpened(),
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
