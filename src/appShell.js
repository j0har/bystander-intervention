// appShell.js — AppShell (C0). Single-screen-visible container, linear
// advance, tracking-init-before-first-render, owns app-level state.

import { screens, totalScreens, dPathwayMap, debriefBaselines, phaseCards } from "./data.js?v=20260915d";
import { renderScreen, formatPercent, el } from "./render.js?v=20260915d";
import {
  trackInitialized,
  trackAnswered,
  trackScreenCompleted,
  trackHintOpened,
  trackModuleCompleted,
} from "./xapi.js?v=20260909c";
import { scormInit, scormSetIncomplete, scormSetCompleted, scormTerminate } from "./scorm.js?v=20260907a";

// Dev navigation shortcut — gated at runtime, never shippable by default.
// Structurally absent on the deployed GitHub Pages domain; no build step
// needed to strip it.
const DEV_NAV_ENABLED = ["localhost", "127.0.0.1"].includes(window.location.hostname);

// Fixed D order (screens 4/5=Direct, 6/7=Distract, 8/9=Delegate,
// 10/11=Document, 12/13=Delay), read from phaseCards' own key order so it
// can't drift from render.js's own D_ORDER.
const D_ORDER = Object.keys(phaseCards);

function initialState() {
  return {
    currentScreenIndex: 0,
    completedScreens: new Set(),
    // flagHistory: whether a flagged option (escalating without the
    // affected person's consent, per FDD A6) was ever selected, on any
    // submission not just first — a signal meant to surface a risk pattern
    // shouldn't disappear because a later retry got it right. Internal/
    // xAPI-only, never learner-visible.
    flagHistory: {}, // screenId -> bool
    answeredOnce: new Set(), // screenIds that have fired their F3 `completed` statement
    // selections: the learner's first-submitted option per scenario screen,
    // needed for the debrief's per-scenario "You and X%..." line. First
    // submission only, same rationale as answeredOnce — reaching a screen
    // again via Back shouldn't silently overwrite what the debrief will
    // show.
    selections: {}, // screenId -> optionId
    scormActive: false,
    moduleCompleted: false, // guards F6 firing more than once per registration
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
// sharing a row with a static module title, plus the five-part practice
// track below. Title and track are aria-hidden (decorative); the back
// button is not, since it's a genuine control — a screen-reader-facing
// progress affordance is a deliberate follow-up, not folded in here. Real
// navigation context for AT users comes from each screen's own heading
// (focus moves there on every mount — see mountScreen below).
//
// The back control lives here, not per-screen, so there's exactly one,
// consistently placed above the track on every non-splash screen, rather
// than buried in scrolling content on some screens and absent from others.
function updateProgress() {
  const screen = screens[state.currentScreenIndex];
  // No progress indicator on the splash screen — "Screen 1 of 14" reads
  // wrong above a title/Start screen.
  if (screen.variant === "splash") {
    progressEl.textContent = "";
    return;
  }

  progressEl.innerHTML = "";

  const canGoBack =
    state.currentScreenIndex > 0 &&
    state.completedScreens.has(screens[state.currentScreenIndex - 1]?.id);
  const headerRow = el("div", { class: "app-header__row" }, [
    // Genuine navigation control, not decorative — carries no aria-hidden,
    // unlike the title/track around it.
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

// Builds the debrief's five comparison lines from what the learner actually
// picked (state.selections), not always the best-fit option — the debrief
// validates whatever the learner chose, using real percentages with no
// bucketing. Under the normal linear flow every scenario is answered
// before Continue appears, so all five ids resolve; the null guard only
// covers an edge unreachable in practice (no persistence, so a mid-way
// reload can't happen without a fresh registration anyway).
//
// Returns one object per line (not a pre-joined string) so render.js can
// pair each line with its scenario's puzzle-piece art and the D-color left
// edge the pick mapped to. `color` falls back to the neutral
// secondary-text token for an off-framework pick, since no D token applies
// there.
const SCENARIO_SCREEN_IDS = [4, 6, 8, 10, 12];
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

  // F6 fires once, on arrival at the debrief screen, not on a button click
  // — decouples completion tracking from the Retry/Exit buttons below,
  // either of which is available after the module is already complete.
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
