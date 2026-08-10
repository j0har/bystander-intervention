// appShell.js — AppShell (C0). Single-screen-visible container, linear
// advance, tracking-init-before-first-render, owns app-level state.
// Per Component Architecture Spec v1.3 §AppShell (renumbered for 11 screens).

import { screens, totalScreens, dPathwayMap } from "./data.js?v=20260810c";
import { renderScreen } from "./render.js?v=20260810c";
import {
  trackInitialized,
  trackAnswered,
  trackScreenCompleted,
  trackHintOpened,
  trackReferenceOpened,
  trackModuleCompleted,
} from "./xapi.js?v=20260810c";
import { scormInit, scormSetIncomplete, scormSetCompleted, scormTerminate } from "./scorm.js?v=20260810c";

// Dev navigation shortcut — gated at runtime, never shippable by default.
// Structurally absent on the deployed GitHub Pages domain; no build step
// needed to strip it.
const DEV_NAV_ENABLED = ["localhost", "127.0.0.1"].includes(window.location.hostname);

const state = {
  currentScreenIndex: 0,
  completedScreens: new Set(),
  hardFailFlags: {}, // screenId -> bool, records whether a hard-fail option
  // was EVER selected (any submission, not just first) — first-submission-
  // only vs any-submission is explicitly unresolved by any source doc;
  // any-submission chosen here as the more conservative read for a signal
  // that's meant to surface a risk pattern, not reward getting it right on
  // a later retry.
  answeredOnce: new Set(), // screenIds that have fired their F3 `completed` statement
  scormActive: false,
};

const appEl = document.getElementById("app");
const progressEl = document.getElementById("progress");

function updateProgress() {
  const n = state.currentScreenIndex + 1;
  progressEl.textContent = `Screen ${n} of ${totalScreens}`;
}

function mountScreen(index) {
  const screen = screens[index];
  appEl.innerHTML = "";

  const ctx = {
    canGoBack: index > 0 && state.completedScreens.has(screens[index - 1]?.id),
    onBack: () => goTo(index - 1),
    onAdvance: () => {
      state.completedScreens.add(screen.id);
      if (screen.id === totalScreens) {
        trackModuleCompleted();
        if (state.scormActive) scormSetCompleted();
        return; // last screen — nothing further to mount
      }
      goTo(index + 1);
    },
    onSubmit: (screenId, scenarioInstance, optionId) => {
      trackAnswered(screenId, scenarioInstance, optionId);

      const hardFailOptions = screen.hardFailOptions || [];
      if (hardFailOptions.includes(optionId)) {
        state.hardFailFlags[screenId] = true;
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
    node = renderScreen(screen, ctx);
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
