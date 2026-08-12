// scorm.js — thin SCORM-detection adapter. Mirrors completion/status only
// through a SCORM API when one is present at runtime (e.g. the module is
// launched inside a SCORM-wrapping LMS instead of taking the xAPI-first
// path). No suspend-data / resume support — this is deliberately narrower
// than answer-level tracking, which xAPI already covers per-choice
// regardless of whether a SCORM API is present. Per shell architecture
// Decision 1 addendum: reset-on-reload applies here too.

const VERSIONS = ["1.2", "2004"];

function findAPI(win, triesLeft = 500) {
  while (
    !win.API &&
    !win.API_1484_11 &&
    win.parent &&
    win.parent !== win &&
    triesLeft > 0
  ) {
    triesLeft -= 1;
    win = win.parent;
  }
  return win.API_1484_11 ? { api: win.API_1484_11, version: "2004" }
    : win.API ? { api: win.API, version: "1.2" }
    : null;
}

let handle = null;

/** Call once, before first render (mirrors xAPI's F1 timing — tracking
 * initializes before the learner can interact). No-ops silently if no
 * SCORM API is found; that's the expected xAPI-only / GitHub Pages path. */
export function scormInit() {
  const found = findAPI(window);
  if (!found) {
    // Single-glance confirmation of which mode this launch is running in —
    // mirrors xapi.js's launch-context log (added 2026-08-12, same
    // rationale: read this first before checking anything else).
    console.info("[scorm] no SCORM API found — xAPI-only path, nothing will be mirrored to a SCORM runtime");
    handle = null;
    return false;
  }
  handle = found;
  try {
    const ok =
      handle.version === "1.2"
        ? handle.api.LMSInitialize("")
        : handle.api.Initialize("");
    if (ok === "false" || ok === false) {
      console.warn("[scorm] Initialize returned false");
      handle = null;
      return false;
    }
    console.info(`[scorm] SCORM ${handle.version} API found and initialized`);
    return true;
  } catch (err) {
    console.warn("[scorm] Initialize threw", err);
    handle = null;
    return false;
  }
}

function setValue(name12, name2004, value) {
  if (!handle) return;
  try {
    if (handle.version === "1.2") {
      handle.api.LMSSetValue(name12, value);
      handle.api.LMSCommit("");
    } else {
      handle.api.SetValue(name2004, value);
      handle.api.Commit("");
    }
    // Single-glance confirmation a value actually reached the SCORM API —
    // added 2026-08-12, same rationale as xapi.js's [xapi:sent] log (the
    // prior version only logged failures, so success and untested looked
    // identical from the console).
    console.info("[scorm:sent]", handle.version === "1.2" ? name12 : name2004, "=", value);
  } catch (err) {
    console.warn("[scorm] SetValue failed", name12, err);
  }
}

/** Mirror in-progress status. Call once, on first learner interaction. */
export function scormSetIncomplete() {
  setValue("cmi.core.lesson_status", "cmi.completion_status", "incomplete");
}

/** Mirror completion. Call at the same point xAPI's trackModuleCompleted
 * fires (F6 — reaching the Debrief screen). */
export function scormSetCompleted() {
  setValue("cmi.core.lesson_status", "cmi.completion_status", "completed");
}

/** Call on page unload if a SCORM session is active. */
export function scormTerminate() {
  if (!handle) return;
  try {
    if (handle.version === "1.2") {
      handle.api.LMSFinish("");
    } else {
      handle.api.Terminate("");
    }
  } catch (err) {
    console.warn("[scorm] Terminate failed", err);
  }
}

export function isScormActive() {
  return handle !== null;
}
