// xapi.js — tracking module. Design driver is cohort-level trend analysis
// over time, never per-attempt scoring: no `result.score` appears anywhere
// in this module, by design.
//
// Actor identity and the LRS endpoint/auth pair are supplied externally by
// whatever launches the module (SCORM Cloud / an LMS) at launch time. If
// opened with no LMS launch context (local dev, GitHub Pages with no launch
// params), tracking calls no-op and log locally instead of sending
// statements with a fabricated actor.

const BASE_IRI = "https://joharsingh.com/xapi/dbi/";

let registrationId = null;
let launchContext = null; // { endpoint, authToken, actor, registration } | null when unlaunched
let hintOpened = false; // the hint statement fires on first open only

function uuidv4() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  // Fallback for environments without crypto.randomUUID (older Safari).
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}

/** Normalize a launch-parameter actor into a valid xAPI 1.0.3 Agent object.
 * SCORM Cloud's `actor` launch parameter follows the older Tin Can Launch
 * shape: `name`/`account` as single-element arrays, and account fields
 * named `accountServiceHomePage`/`accountName` instead of xAPI's
 * `homePage`/`name`. Sent verbatim this fails xAPI 1.0.3 Agent validation,
 * so every statement is normalized once here. */
function normalizeActor(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const first = (v) => (Array.isArray(v) ? v[0] : v);
  const out = { objectType: "Agent" };
  if (raw.name) out.name = first(raw.name);
  if (raw.mbox) out.mbox = first(raw.mbox);
  if (raw.mbox_sha1sum) out.mbox_sha1sum = first(raw.mbox_sha1sum);
  if (raw.openid) out.openid = first(raw.openid);
  if (raw.account) {
    const acct = first(raw.account);
    if (acct) {
      out.account = {
        homePage: acct.homePage ?? acct.accountServiceHomePage,
        name: acct.name ?? acct.accountName,
      };
    }
  }
  return out;
}

/** Read launch parameters (endpoint + auth + registration) from the URL
 * query string, the shape SCORM Cloud's xAPI launch typically uses. Returns
 * null if endpoint/auth are absent — that's the expected local-dev /
 * unlaunched case, not an error. */
function readLaunchParams() {
  const params = new URLSearchParams(window.location.search);
  const endpoint = params.get("endpoint");
  const auth = params.get("auth");
  const actorParam = params.get("actor");
  // SCORM Cloud's own registration ID for this launch. Statements must be
  // sent under this exact registration — the LRS endpoint/auth pair is
  // registration-scoped, and a mismatched context.registration is rejected
  // with 403.
  const registration = params.get("registration");
  if (!endpoint || !auth) return null;
  let actor;
  try {
    actor = actorParam ? normalizeActor(JSON.parse(actorParam)) : undefined;
  } catch {
    actor = undefined;
  }
  // SCORM Cloud returns `endpoint` with a trailing slash (e.g.
  // ".../lrs/<key>/") — stripped so the '/statements' join below never
  // produces a double slash.
  return { endpoint: endpoint.replace(/\/+$/, ""), authToken: auth, actor, registration };
}

/** Queue with capped exponential backoff. In-memory only: a reload loses any
 * un-flushed statements, since the module keeps no persistence. */
const queue = [];
let flushing = false;

async function sendStatement(statement) {
  if (!launchContext) {
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
      // Logs each accepted statement for local verification.
      console.info("[xapi:sent]", item.statement.verb.id.split("/").pop(), item.statement.object.id);
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

/** `initialized`: module load, before the first screen renders. */
export function trackInitialized() {
  launchContext = readLaunchParams();
  // Use SCORM Cloud's own registration ID when we have one so statements
  // land under the registration the LRS auth token is scoped to; fall back
  // to a random UUID only when there's no launch context at all (local dev
  // / unlaunched).
  registrationId = launchContext?.registration ?? uuidv4();
  console.info(
    "[xapi] launch context",
    launchContext ? "FOUND — sending to " + launchContext.endpoint : "NOT found — local-only mode, nothing will be sent to an LRS"
  );
  const stmt = baseStatement(
    "http://adlnet.gov/expapi/verbs/initialized",
    "initialized",
    "module",
    "course",
    "Digital Bystander Intervention"
  );
  sendStatement(stmt);
}

/** `answered`: every scenario Submit. */
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

/** `completed` for a scenario: first submission per screen; Retry resets it. */
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

/** `interacted`: the capstone's hint <details> opened, first open only. No
 * screen sets `data.hint`, so this never fires. */
export function trackHintOpened() {
  if (hintOpened) return;
  hintOpened = true;
  const stmt = baseStatement(
    "http://adlnet.gov/expapi/verbs/interacted",
    "interacted",
    "module/screen/12/hint",
    "interaction",
    "Capstone hint"
  );
  sendStatement(stmt);
}

/** `completed` for the module: the learner reaches the Debrief screen. Fires
 * once per registration. No result.score: the module has no scoring model. */
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
