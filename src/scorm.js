// scorm.js — thin SCORM-detection adapter. Mirrors completion/status only
// through a SCORM API when one is present at runtime (the module is
// launched inside a SCORM-wrapping LMS instead of taking the xAPI-first
// path). No suspend-data / resume support — narrower than xAPI's
// answer-level tracking, which already covers per-choice detail regardless
// of whether a SCORM API is present.

const VERSIONS = ["1.2", "2004"];

function climbParents(win, triesLeft) {
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
  return win;
}

function findAPI(win, triesLeft = 500) {
  let found = climbParents(win, triesLeft);
  if (!found.API && !found.API_1484_11 && found.opener && found.opener !== found) {
    // ADL SCORM 1.2/2004 RTE API-discovery fallback: an LMS may launch the
    // SCO in a new browser window instead of an iframe (SCORM Cloud does
    // this), putting the API in window.opener's parent chain instead of
    // window.parent's.
    found = climbParents(found.opener, triesLeft);
  }
  return found.API_1484_11 ? { api: found.API_1484_11, version: "2004" }
    : found.API ? { api: found.API, version: "1.2" }
    : null;
}

let handle = null;

/** Call once, before the first render, so tracking initializes before the
 * learner can interact. No-ops silently if no SCORM API is found, the
 * expected path on GitHub Pages. */
export function scormInit() {
  const found = findAPI(window);
  if (!found) {
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
    // Logs each value sent, so success is distinguishable from untested.
    console.info("[scorm:sent]", handle.version === "1.2" ? name12 : name2004, "=", value);
  } catch (err) {
    console.warn("[scorm] SetValue failed", name12, err);
  }
}

/** Mirror in-progress status. Called on each screen's first submit. */
export function scormSetIncomplete() {
  setValue("cmi.core.lesson_status", "cmi.completion_status", "incomplete");
}

/** Mirror completion. Called when xAPI's trackModuleCompleted fires, on
 * reaching the Debrief screen. */
export function scormSetCompleted() {
  setValue("cmi.core.lesson_status", "cmi.completion_status", "completed");
}

/** Call on page unload when a SCORM session is active. */
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
