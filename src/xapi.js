// xapi.js — tracking module, per DBI-xAPI-Integration-Spec-v1.1.md §4–6
// (renumbered screen scheme). Design driver is cohort-level trend analysis
// over time, never per-attempt scoring: no `result.score` appears anywhere
// in this module, by design, on any statement.
//
// Actor identity and the LRS endpoint/auth pair are supplied externally by
// whatever launches the module (SCORM Cloud / an LMS) at launch time. This
// build does NOT hard-code a mock actor or a static endpoint. If the module
// is opened with no LMS launch context (e.g. local dev, GitHub Pages with no
// launch params), tracking calls no-op and log locally instead of sending
// statements with a fabricated actor — per spec §6.

const BASE_IRI = "https://joharsingh.com/xapi/dbi/";

let registrationId = null;
let launchContext = null; // { endpoint, authToken, actor } | null when unlaunched
let hintOpened = false; // F4 fires once per registration, first open only

function uuidv4() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  // Fallback for environments without crypto.randomUUID (older Safari).
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}

/** Read launch parameters (endpoint + auth) from the URL query string, the
 * shape SCORM Cloud's xAPI launch typically uses. Returns null if absent —
 * that's the expected local-dev / unlaunched case, not an error. */
function readLaunchParams() {
  const params = new URLSearchParams(window.location.search);
  const endpoint = params.get("endpoint");
  const auth = params.get("auth");
  const actorParam = params.get("actor");
  if (!endpoint || !auth) return null;
  let actor;
  try {
    actor = actorParam ? JSON.parse(actorParam) : undefined;
  } catch {
    actor = undefined;
  }
  return { endpoint, authToken: auth, actor };
}

/** Queue with capped exponential backoff. In-memory only — a reload loses
 * any un-flushed statements by design (matches the no-persistence session
 * model; see shell architecture Decision 1). */
const queue = [];
let flushing = false;

async function sendStatement(statement) {
  if (!launchContext) {
    // No LMS launch context — log locally, do not fabricate an endpoint.
    console.info("[xapi:local]", statement.verb.id.split("/").pop(), statement);
    return;
  }
  queue.push({ statement, attempts: 0 });
  flushQueue();
}

async function flushQueue() {
  if (flushing) return;
  flushing = true;
  while (queue.length) {
    const item = queue[0];
    try {
      const res = await fetch(`${launchContext.endpoint}/statements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Experience-API-Version": "1.0.3",
          Authorization: launchContext.authToken,
        },
        body: JSON.stringify(item.statement),
      });
      if (!res.ok) throw new Error(`xAPI send failed: ${res.status}`);
      queue.shift();
    } catch (err) {
      item.attempts += 1;
      if (item.attempts >= 3) {
        console.warn("[xapi] dropping statement after 3 attempts", err, item.statement);
        queue.shift();
        continue;
      }
      const backoffMs = 300 * 2 ** item.attempts;
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  flushing = false;
}

function baseStatement(verbId, verbDisplay, objectId, objectType, objectName) {
  return {
    actor: launchContext?.actor ?? { name: "Local dev", mbox: "mailto:dev@localhost" },
    verb: { id: verbId, display: { "en-US": verbDisplay } },
    object: {
      id: `${BASE_IRI}${objectId}`,
      objectType: "Activity",
      definition: {
        type: `http://adlnet.gov/expapi/activities/${objectType}`,
        name: { "en-US": objectName },
      },
    },
    context: {
      registration: registrationId,
      extensions: {
        [`${BASE_IRI}extensions/platform`]: "DBI",
      },
    },
    timestamp: new Date().toISOString(),
  };
}

/** F1 — module load, before first screen renders. Fires once per registration. */
export function trackInitialized() {
  registrationId = uuidv4();
  launchContext = readLaunchParams();
  const stmt = baseStatement(
    "http://adlnet.gov/expapi/verbs/initialized",
    "initialized",
    "module",
    "course",
    "Digital Bystander Intervention"
  );
  sendStatement(stmt);
}

/** F2 — every scenario Submit (scored and unscored alike, every retry). */
export function trackAnswered(screenId, scenarioInstance, selectedOptionId) {
  const stmt = baseStatement(
    "http://adlnet.gov/expapi/verbs/answered",
    "answered",
    `module/screen/${screenId}`,
    "interaction",
    `Scenario ${scenarioInstance}`
  );
  stmt.object.definition.interactionType = "choice";
  stmt.result = { response: selectedOptionId };
  stmt.context.extensions[`${BASE_IRI}extensions/scenario-instance`] = scenarioInstance;
  sendStatement(stmt);
}

/** F3 — first submission only, per scenario instance per registration. */
export function trackScreenCompleted(screenId, scenarioInstance, dPathway) {
  const stmt = baseStatement(
    "http://adlnet.gov/expapi/verbs/completed",
    "completed",
    `module/screen/${screenId}`,
    "interaction",
    `Scenario ${scenarioInstance}`
  );
  stmt.object.definition.interactionType = "choice";
  stmt.result = { completion: true };
  stmt.context.extensions[`${BASE_IRI}extensions/scenario-instance`] = scenarioInstance;
  if (dPathway) {
    stmt.context.extensions[`${BASE_IRI}extensions/d-pathway`] = dPathway;
  }
  sendStatement(stmt);
}

/** F4 — hint <details> toggled open, Screen 10 only. Fires once, first open only. */
export function trackHintOpened() {
  if (hintOpened) return;
  hintOpened = true;
  const stmt = baseStatement(
    "http://adlnet.gov/expapi/verbs/interacted",
    "interacted",
    "module/screen/10/hint",
    "interaction",
    "Capstone hint"
  );
  sendStatement(stmt);
}

/** F5 — reference <details> toggled open, every open (not close), any of the
 * 7 scenario screens. One activity ID — content is identical everywhere. */
export function trackReferenceOpened(fromScreenId) {
  const stmt = baseStatement(
    "http://adlnet.gov/expapi/verbs/experienced",
    "experienced",
    "module/reference",
    "interaction",
    "The 5Ds reference"
  );
  stmt.context.extensions[`${BASE_IRI}extensions/opened-from-screen`] = fromScreenId;
  sendStatement(stmt);
}

/** F6 — learner reaches the Debrief screen. Fires once per registration.
 * result.score is intentionally absent — no scoring model is defined. */
export function trackModuleCompleted() {
  const stmt = baseStatement(
    "http://adlnet.gov/expapi/verbs/completed",
    "completed",
    "module",
    "course",
    "Digital Bystander Intervention"
  );
  stmt.result = { completion: true };
  sendStatement(stmt);
}

export function getRegistrationId() {
  return registrationId;
}
