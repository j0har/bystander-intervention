// data.js — screen content, single ordered array. Screen numbering here is
// the CANONICAL 1–14 scheme from DBI-Learner-Copy-FINAL-2026-09-05.md (five
// assessed scenarios, each immediately followed by the phase-transition
// card for the D it tests). This replaces the prior 1–11/7-scenario/scored
// scheme entirely — see "DBI code rebuild — scoring model and 5-scenario
// restructure" (task card) for the full rationale. Source docs (storyboard
// v1.2, component spec v1.3, xAPI spec v1.1) still describe the OLD scheme
// as of this rebuild — their sweep is the next task, not done here.
//
// Scoring-model note: there is no criterion-referenced pass/fail anywhere in
// this module, for the learner or the org — never was, in the shipped
// build. The old `scored` boolean is dropped, not renamed: once every
// remaining scenario screen is uniformly diagnostic (no more "taught, not
// scored" screens survive the cut), the field no longer distinguishes
// anything. `hardFailOptions` is renamed `flagOptions` — the underlying
// signal (an option that hands a decision to authority without the
// affected person's consent, per the FDD's A6 error patterns) is kept,
// internal/xAPI-only, never learner-visible — Johar's call, 2026-09-07.

export const referenceContent = [
  {
    d: "Direct",
    text: "Full 4-question gate, conjunctive: physically safe for you? · target physically safe? · escalation unlikely? · can you tell the target wants someone to speak up?",
  },
  {
    d: "Delegate",
    text: "Only at the target’s request — except credible threat of imminent harm or a legal mandatory-reporting duty. In those cases the duty governs; tell the target what you’re required to do rather than asking permission.",
  },
  {
    d: "Document",
    text: "Always ask what they want done with it; never use it without permission. Check first whether anyone is already helping — if so, consider another D.",
  },
  {
    d: "Delay",
    text: "Check in privately, afterward. The moment passing doesn’t mean the option is gone.",
  },
  {
    d: "Distract",
    text: "Interrupt the dynamic — a clarifying question, a subject change.",
  },
];

// Phase-transition card content — one card per D, revealed progressively as
// the learner completes each scenario. Wording is verbatim from
// DBI-Learner-Copy-FINAL-2026-09-05.md / DBI-5Ds-Content-Reconciliation-
// 2026-09-03.md (system-of-record for sourcing) — not Claude's to author.
// Icon set switched to the "-tinted" variants (DBI Row 14 Design pass,
// 2026-09-09) — these are fixed-color glyphs meant to sit on the card's own
// tinted icon disc; unlike the plain set they don't read --icon-color, so
// they stay legible regardless of the disc's tint. Reuses the existing
// --color-d-* tokens for the disc/rule/eyebrow color (DBI Row 9).
export const phaseCards = {
  Direct: {
    icon: "icon-5d-direct-tinted.svg",
    color: "var(--color-d-direct)",
    definition:
      "Calmly addressing the behaviour and drawing a clear boundary in the shared digital space.",
    whenToUse: "When it feels safe, peer-level, and the situation is appropriate for quick course-correction.",
    example: "“Let’s keep our comments constructive. That message might have come across more critically than expected.”",
  },
  Distract: {
    icon: "icon-5d-distract-tinted.svg",
    color: "var(--color-d-distract)",
    definition:
      "Subtly redirecting a conversation to ease tension or interrupt harm when something feels unsafe.",
    whenToUse: "Useful in early signs of exclusion, tension, or questionable comments in a chat or channel.",
    example: "“Let’s refocus on the project details. I think we were talking about the next steps?”",
  },
  Delegate: {
    icon: "icon-5d-delegate-tinted.svg",
    color: "var(--color-d-delegate)",
    definition:
      "Bringing someone in to help address the issue appropriately — only if the person affected wants that support brought in.",
    whenToUse: "Helpful when the behaviour involves power imbalances, repeat issues, or impacts someone’s ability to participate.",
    example:
      "A teammate mentions that a client keeps steamrolling them on calls, and it’s starting to wear on them. You ask: “Would it help if I brought this to our team lead, or would you rather handle it your own way for now?”",
  },
  Document: {
    icon: "icon-5d-document-tinted.svg",
    color: "var(--color-d-document)",
    definition: "Ask first, then help capture what happened — only with their say in how it’s used.",
    whenToUse:
      "Useful if a colleague may need a record later, or the situation could escalate — ask before you start noting anything down, not after.",
    example:
      "After a tense exchange in a group chat, a colleague mentions it’s still bothering them. You ask: “Would it help if I noted what was said and when — only if that’s something you’d want on record?”",
  },
  Delay: {
    icon: "icon-5d-delay-tinted.svg",
    color: "var(--color-d-delay)",
    definition: "Check in privately with the person who was affected.",
    whenToUse: "When someone withdrew, was ignored, corrected sharply, or experienced uncomfortable interactions online.",
    example: "“I noticed the interaction in the channel earlier and just wanted to check in. How are you doing?”",
  },
};

// Which D (or "off-framework") each option maps to, for the xAPI dPathway
// extension (F3 / completed statements). Not supplied by any source doc for
// any screen — populated here at build time, same practice as the prior
// scheme (see git history) — internal xAPI metadata only, invisible to
// learners. Rebuilt against the new 1–14 ids and the final option sets
// (Screen 8's Delegate scenario dropped its 4th option in the final copy;
// Screen 12 is the unchanged capstone).
export const dPathwayMap = {
  4: { A: "Direct", B: "Delay", C: "off-framework" },
  6: { A: "Direct", B: "Distract", C: "Delay" },
  8: { A: "Direct", B: "off-framework", C: "Delegate" },
  10: { A: "off-framework", B: "Document", C: "off-framework", D: "Direct" },
  12: { A: "Direct", B: "Distract", C: "Delay", D: "off-framework" },
};

// Synthetic baseline percentages for the debrief's "You and X% of people
// chose to..." comparison line — per
// DBI-Debrief-Synthetic-Baseline-Methodology-2026-09-01.md (method, persona
// set, and 0.8-adherence formula all Johar-approved/closed 2026-09-06).
// Screens 4/6/12 reuse that doc's own worked numbers unchanged (their option
// sets didn't change in the final copy). Screens 8 and 10 are RECOMPUTED
// here, not reused: Screen 8's final copy dropped a 4th option (the old
// "forward to HR immediately" distractor never made it into
// DBI-Learner-Copy-FINAL-2026-09-05.md), and Screen 10 is new content
// entirely (the old responder-risk item, rewritten to test Document) — see
// prototype-build-note.md's 2026-09-07 entry for both worked calculations.
// `choice` text is a first-pass draft distillation for Johar's sign-off,
// same pattern as Screen 8's stem draft — not settled copy.
// Formula: percentage = [k×0.8 + (5−k)×(0.2/(m−1))] / 5, k = personas
// picking that option (of 5), m = option count on that screen.
export const debriefBaselines = {
  4: {
    situation: "a stereotype went unanswered in a busy Slack channel",
    options: {
      A: { percent: 52.0, choice: "answer in the channel directly" },
      B: { percent: 24.0, choice: "check in with the colleague privately" },
      C: { percent: 24.0, choice: "forward it to a manager" },
    },
  },
  6: {
    situation: "a colleague was interrupted twice in a meeting and went quiet",
    options: {
      A: { percent: 24.0, choice: "call out the interruption directly" },
      B: { percent: 52.0, choice: "ask the facilitator to redirect" },
      C: { percent: 24.0, choice: "wait and message privately after" },
    },
  },
  // RECOMPUTED 2026-09-07 — final copy has 3 options (A/B/C), not the 4 the
  // methodology doc's worked table assumed. Votes: Names it→A (1), Escalates
  // to authority→defaults to best-fit, no authority option exists (C),
  // Keeps it private→C (1), Weighs exposure→defaults, F4 Low (C), Applies
  // framework→C (C). k(A)=1, k(B)=0, k(C)=4, m=3.
  8: {
    situation: "a senior manager’s correction went out reply-all, CC’d to directors",
    options: {
      A: { percent: 24.0, choice: "push back on the tone publicly" },
      B: { percent: 10.0, choice: "let the thread move to next steps" },
      C: { percent: 66.0, choice: "check in privately and ask first" },
    },
  },
  // NEW 2026-09-07 — first run against final copy (new stem/options, no
  // prior worked table exists). Votes: Names it→D (most direct/confrontational,
  // even unsafe) (1), Escalates to authority→A (routes to their manager) (1),
  // Keeps it private→B (stays contained, no third party) (1), Weighs
  // exposure→defaults, F4 Low here (B) (1), Applies framework→B (best fit)
  // (1). k(A)=1, k(B)=3, k(C)=0, k(D)=1, m=4.
  10: {
    situation: "a colleague disclosed a recurring comment about their accent",
    options: {
      A: { percent: 21.3, choice: "offer to raise it with their manager" },
      B: { percent: 50.7, choice: "offer to watch for it and confirm" },
      C: { percent: 6.7, choice: "reassure them it probably wasn’t intentional" },
      D: { percent: 21.3, choice: "say you’ll address it directly" },
    },
  },
  12: {
    situation: "a comment about someone’s appearance went unaddressed on a call",
    options: {
      A: { percent: 65.3, choice: "address it briefly and follow up privately" },
      B: { percent: 6.7, choice: "redirect the conversation and follow up privately" },
      C: { percent: 21.3, choice: "follow up privately only" },
      D: { percent: 6.7, choice: "message the person who made the comment" },
    },
  },
};

// screens[] — the single ordered source of truth AppShell iterates over.
// component: 'StatementScreen' | 'PhaseCardScreen' | 'ScenarioScreen'
export const screens = [
  // ---- Screen 1 — Splash / title screen --------------------------------
  {
    id: 1,
    component: "StatementScreen",
    variant: "splash",
    weighted: false,
    data: {
      illustration: "Diverse-Team--Streamline-Brooklyn.svg",
      headline: "Online Bystander Intervention",
      subtitle: "Practicing the 5Ds Framework",
      // No caption. There is no "your progress isn't saved" warning anywhere
      // in this module, on any screen — Johar's standing preference,
      // reaffirmed 2026-09-07 (not an open gap, not deferred to Screen 2 or
      // anywhere else; an earlier draft of this rebuild framed it as a gap
      // to resolve, which was a misreading).
      advanceLabel: "Start",
    },
  },

  // ---- Screen 2 — Introduction ------------------------------------------
  {
    id: 2,
    component: "StatementScreen",
    weighted: false,
    data: {
      headline: "What is Online Bystander Intervention?",
      // Illustration candidate identified but not sized/placed —
      // Remote-Team--Streamline-Brooklyn.svg, per DBI Row 14 (out of scope
      // for this rebuild, deferred to the Row 14 Design session).
      body: [
        "Most of our collaboration now happens online in chat threads, email conversations, shared files, and virtual meetings. These tools make working together easier, but they also create moments where someone is sidelined, a comment lands wrong, or a message feels sharper than intended.",
        "Online bystander intervention is the act of safely supporting someone who may be experiencing harm in these environments and responding in ways that maintain respect and inclusion.",
        "In this 10-minute learning experience, you’ll practice applying the 5Ds of bystander intervention. You’ll encounter familiar workplace situations where colleagues are mistreated and you have an opportunity to choose actions to help.",
      ],
      advanceLabel: "Continue",
    },
  },

  // ---- Screen 3 — Power Dynamics -----------------------------------------
  {
    id: 3,
    component: "StatementScreen",
    weighted: true,
    data: {
      headline: "Power Dynamics",
      body: [
        "The most appropriate response in a situation will depend on the power dynamics in the relationships present. Before you respond, consider:",
      ],
      powerQuestions: [
        { n: 1, text: "Whether the person doing harm has power over the person being harmed, or" },
        { n: 2, text: "Whether the person doing harm has power over you." },
      ],
      bodyAfter: [
        "These two questions shape whether an action could make things worse for the person being harmed or become less safe for you. It’s always a good idea to check in with the target before taking any action that involves documenting or reporting the incident.",
      ],
      // FLAG: DBI-Learner-Copy-FINAL-2026-09-05.md's Screen 3 text doesn't
      // show an explicit [Continue] bracket the way Screens 1/2 do — kept
      // here as a reasonable default (every non-terminal screen needs an
      // advance control) rather than a content decision.
      advanceLabel: "Continue",
    },
  },

  // ---- Screen 4 — Scenario 1: Slack stereotype (Direct) ------------------
  {
    id: 4,
    component: "ScenarioScreen",
    scenarioNumber: 1,
    // Escalating the target's situation to a manager without asking first —
    // same error pattern as the old scheme's Screen 4/C (FDD A6: E4/E6).
    flagOptions: ["C"],
    data: {
      illustration: "scenario-1-puzzle-piece.svg",
      shortTitle: "A joke, then silence",
      stem:
        "Your team has a busy Slack channel that's usually pretty active, with lots of quick back-and-forth. A colleague posts a meme with a regional stereotype. Another colleague, who's usually very active in this channel, doesn't respond. The thread moves on. They haven't posted since.",
      question: "What's the most appropriate way to respond?",
      options: [
        {
          id: "A",
          correct: true,
          text: "Reply with a comment addressing the stereotype.",
          feedback:
            "Yes, answering in the same space where it happened is what resets the norm. Your colleague fell quiet and no one in the channel spoke up. The harm was visible and the response should be too.",
        },
        {
          id: "B",
          text: "Privately message your colleague to check in.",
          feedback:
            "Checking in privately is meaningful but it still leaves the comment unanswered in front of everyone who saw it. Private support is the right instinct but the harmful public comment also needs a public answer.",
        },
        {
          id: "C",
          text: "Forward it to your manager and ask them to address it.",
          feedback:
            "Forwarding it to your manager does not directly address the harmful public comment or support your colleague. The comment remains in the chat and your colleague may not want to get a formal authority involved.",
        },
      ],
      submitLabel: "Submit",
    },
  },

  // ---- Screen 5 — Phase-transition card: Direct --------------------------
  { id: 5, component: "PhaseCardScreen", weighted: false, data: { d: "Direct", advanceLabel: "Continue" } },

  // ---- Screen 6 — Scenario 2: Meeting interruption (Distract) ------------
  {
    id: 6,
    component: "ScenarioScreen",
    scenarioNumber: 2,
    data: {
      illustration: "scenario-2-puzzle-piece.svg",
      shortTitle: "Interrupted in a meeting",
      stem:
        "In a team meeting, a colleague tries to share an idea but is interrupted. They try again a few minutes later but is interrupted again. The facilitator doesn't notice. Your colleague goes quiet for the rest of the meeting.",
      question: "What's the best way to respond?",
      options: [
        {
          id: "A",
          text: "Call out the person who interrupted directly.",
          feedback:
            "Calling out the person who interrupted could lead to unnecessary conflict or tension. The facilitator can easily redirect the discussion without making anyone feel singled out.",
        },
        {
          id: "B",
          correct: true,
          text: "Use the chat, or speak up, to suggest the facilitator come back to your colleague.",
          feedback:
            "Yes, the facilitator is responsible for directing and managing the discussion. A private message can bring your colleague back into the conversation without you directly confronting the person who interrupted.",
        },
        {
          id: "C",
          text: "Wait until after the meeting to send a private message.",
          feedback:
            "Checking in afterward is meaningful but it doesn't address the harm as it's occurring. Waiting until after the meeting misses an opportunity to bring your colleague back into the conversation and have their ideas heard.",
        },
      ],
      submitLabel: "Submit",
    },
  },

  // ---- Screen 7 — Phase-transition card: Distract ------------------------
  { id: 7, component: "PhaseCardScreen", weighted: false, data: { d: "Distract", advanceLabel: "Continue" } },

  // ---- Screen 8 — Scenario 3: Reply-all power dynamics (Delegate) --------
  {
    id: 8,
    component: "ScenarioScreen",
    scenarioNumber: 3,
    // NOTE: the old scheme flagged this scenario's 4th option ("forward to
    // HR immediately") as a hard-fail instance. That option does not exist
    // in the final copy (3 options only, A/B/C) — none of the three is an
    // unconsented escalation-to-authority move, so this scenario carries no
    // flagOptions now. Net flagged-scenario count is unchanged (moved to
    // Screen 10 below) — surfaced here, not silently dropped.
    data: {
      illustration: "scenario-3-puzzle-piece.svg",
      shortTitle: "Corrected in front of everyone",
      stem:
        "A senior manager sends a reply-all email correcting a junior staff member's work. The tone is sharp, the email is CC'd to directors, and the junior staff member stops responding in the thread.",
      question: "Given what's safe for you to do here, what's the best action?",
      options: [
        {
          id: "A",
          text: "Reply-all to suggest that the tone could be more constructive.",
          feedback:
            "A public response will continue to make the junior staff member feel publicly singled out. It will also out the manager and bring more attention to their sharp, corrective message.",
        },
        {
          id: "B",
          text: "Reply-all to acknowledge the correction and confirm next steps.",
          feedback:
            "Shifting to confirming next steps will keep things moving but it quietly signals that what happened was acceptable. It may not be as easy for the junior staff member to move on from this incident.",
        },
        {
          id: "C",
          correct: true,
          text: "Check in with the junior staff member to see if they need support.",
          feedback:
            "Yes, the person affected should be the one to decide whether they want to bring in someone to help. They have to continue working with this manager and it may not feel safe for them to have someone intervene if they are not ready.",
        },
      ],
      submitLabel: "Submit",
    },
  },

  // ---- Screen 9 — Phase-transition card: Delegate ------------------------
  { id: 9, component: "PhaseCardScreen", weighted: false, data: { d: "Delegate", advanceLabel: "Continue" } },

  // ---- Screen 10 — Scenario 4: Responder risk → Document -----------------
  {
    id: 10,
    component: "ScenarioScreen",
    scenarioNumber: 4,
    // Escalating to the target's manager without asking first — same
    // pattern as Screen 4/C above (FDD A6: E4/E6). This is the item that
    // carried the flag in the old scheme (there, Screen 7/D).
    flagOptions: ["A"],
    data: {
      illustration: "scenario-4-puzzle-piece.svg",
      shortTitle: "Mocked for their accent",
      stem:
        "At the end of a virtual 1:1 video call, your colleague discloses that someone else on the team has been subtly mocking and mimicking their pronunciation of certain terminology because of their accent. It's occurred on a few occasions, but you haven't witnessed it yet yourself.",
      question: "What's the most useful way to respond?",
      options: [
        {
          id: "A",
          text: "Offer to raise it with their manager so someone with authority can step in.",
          feedback:
            "The instinct to tell their manager shows that you are taking this situation seriously, but it's a decision that should be made in consultation with the person affected.",
        },
        {
          id: "B",
          correct: true,
          text: "Ask if they would like you to keep an eye out and confirm when you witness it.",
          feedback:
            "Yes, by asking first, you allow the person affected to make the decision about how they want to proceed. Your offer to keep an eye out for them and note what you see is the right kind of support here.",
        },
        {
          id: "C",
          text: "Tell them that the coworker probably didn't mean anything by it.",
          feedback:
            "Reframing the coworker's intent doesn't acknowledge what your colleague just disclosed to you. They've told you that this has happened more than once and it's bothering them.",
        },
        {
          id: "D",
          text: "Tell them that it's unacceptable and that you will address it with them directly.",
          feedback:
            "Calling this unacceptable is the right response. But the decision to raise it with the coworker yourself has the potential to go wrong and cause more harm for your colleague, you, and the person you're confronting.",
        },
      ],
      submitLabel: "Submit",
    },
  },

  // ---- Screen 11 — Phase-transition card: Document -----------------------
  { id: 11, component: "PhaseCardScreen", weighted: false, data: { d: "Document", advanceLabel: "Continue" } },

  // ---- Screen 12 — Scenario 5: Appearance comment (capstone) -------------
  {
    id: 12,
    component: "ScenarioScreen",
    scenarioNumber: 5,
    data: {
      illustration: "scenario-5-puzzle-piece.svg",
      shortTitle: "Camera off after a comment",
      stem:
        "During a video call, someone makes a comment about a teammate's appearance. Your teammate laughs it off with a visibly uncomfortable expression, turns their camera off, and stays quiet for the rest of the call. The call proceeds without anyone addressing it.",
      question: "Which combined response would be most effective?",
      options: [
        {
          id: "A",
          correct: true,
          text: "Address the comment briefly in the meeting and send a private message afterward.",
          feedback:
            "Yes, responding in the meeting resets the norm for everyone who saw it, and the private message reaches the person it actually happened to. Public harm and personal impact are two different problems and this response addresses both.",
        },
        {
          id: "B",
          // Not a plain miss — the final copy explicitly calls this
          // "also defensible," distinct from C/D's outright critique.
          // Rendered with its own signal tier (render.js), not folded into
          // either "best-fit" or "worth a second look."
          defensible: true,
          text: "Redirect the conversation to the agenda and check in with your teammate privately afterward.",
          feedback:
            "This is a reasonable read. Redirecting protects your teammate from more attention in the moment, and checking in privately afterward reaches them directly. What it gives up is the peer signal — the group hears the subject change but not that anyone thought the comment was a problem.",
        },
        {
          id: "C",
          text: "Check in with your teammate privately after the meeting.",
          feedback:
            "Checking in privately matters and they'll feel it. But the comment happened in front of the team, and your teammate went camera-off in front of the team; handling it only behind the scenes doesn't reset anything for everyone who witnessed it.",
        },
        {
          id: "D",
          text: "Send a private message to the person who made the comment.",
          feedback:
            "This talks about your teammate without ever talking to them. The person who was affected gets no signal that anyone noticed, and the response happens somewhere they can't see it. Support that never reaches the person it's for isn't support yet.",
        },
      ],
      submitLabel: "Submit",
    },
  },

  // ---- Screen 13 — Phase-transition card: Delay --------------------------
  { id: 13, component: "PhaseCardScreen", weighted: false, data: { d: "Delay", advanceLabel: "Continue" } },

  // ---- Screen 14 — Debrief ------------------------------------------------
  // Comparison lines are computed at mount time by appShell.js from
  // state.selections + debriefBaselines above — not static here. The old
  // reflection-prompt/implementation-intention/textarea block is DROPPED,
  // not carried forward: DBI-Learner-Copy-FINAL-2026-09-05.md's own Screen
  // 14 content doesn't include it, and its survival was explicitly flagged
  // there as unresolved until this rebuild — Johar confirmed 2026-09-07 the
  // drop is permanent, not pending, and the copy doc has been updated to
  // match (no more "open" framing there).
  {
    id: 14,
    component: "StatementScreen",
    variant: "debrief",
    weighted: true,
    data: {
      headline: "Debrief",
      intro: "Here is how you chose to intervene in situations where you saw someone being mistreated in an online space:",
      closingNote: "Remember four out of the five D's are indirect approaches, and that your goal is to support the person being harassed.",
      retryLabel: "Retry",
      exitLabel: "Exit",
      exitNote: "You can close this tab now.",
    },
  },
];

export const totalScreens = screens.length;
