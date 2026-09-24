// data.js — screen content, single ordered array. Screen numbering (1-14)
// covers five assessed scenarios, each followed by the phase-transition
// card for the D it tests.
//
// No criterion-referenced pass/fail anywhere in this module, for the
// learner or the org. `flagOptions` records whether a flagged option (one
// that hands a decision to authority without the affected person's
// consent, per the FDD's A6 error patterns) was ever selected —
// internal/xAPI-only, never learner-visible.

// Phase-transition card content — one card per D, revealed progressively as
// the learner completes each scenario. Wording is verbatim from the
// learner-copy source doc, not Claude's to author. Icon set uses the
// "-white" variants: the card's icon disc is a full-colour header band
// (--card-color), so the glyph needs to read against solid colour, not a
// tint.
//
// whenToUse: every entry opens with "When [present-tense clause]," matching
// the "When to use" field label below it, for consistency across all five
// cards.
export const phaseCards = {
  Direct: {
    icon: "icon-5d-direct-white.svg",
    color: "var(--color-d-direct)",
    definition:
      "Calmly addressing the behaviour and drawing a clear boundary in the shared digital space.",
    whenToUse: "When it feels safe, peer-level, and the moment calls for a quick course-correction.",
    example: "“Let’s keep our comments constructive. That message might have come across more critically than expected.”",
  },
  Distract: {
    icon: "icon-5d-distract-white.svg",
    color: "var(--color-d-distract)",
    definition:
      "Subtly redirecting a conversation to ease tension or interrupt harm when something feels unsafe.",
    whenToUse: "When there are early signs of exclusion, tension, or questionable comments in a chat or channel.",
    example: "“Let’s refocus on the project details. I think we were talking about the next steps?”",
  },
  Delegate: {
    icon: "icon-5d-delegate-white.svg",
    color: "var(--color-d-delegate)",
    definition:
      "Bringing someone in to help address the issue appropriately, but only if the person affected wants that support brought in.",
    whenToUse: "When the behaviour involves power imbalances, repeat issues, or affects someone’s ability to participate.",
    example:
      "A teammate mentions that a client keeps steamrolling them on calls, and it’s starting to wear on them. You ask: “Would it help if I brought this to our team lead, or would you rather handle it your own way for now?”",
  },
  Document: {
    icon: "icon-5d-document-white.svg",
    color: "var(--color-d-document)",
    definition: "Ask first, then help capture what happened, but only with their say in how it’s used.",
    whenToUse:
      "When a colleague may need a record later, or the situation could escalate. Ask before you start noting anything down, not after.",
    example:
      "After a tense exchange in a group chat, a colleague mentions it’s still bothering them. You ask: “Would it help if I noted what was said and when, but only if that’s something you’d want on record?”",
  },
  Delay: {
    icon: "icon-5d-delay-white.svg",
    color: "var(--color-d-delay)",
    definition: "Check in privately with the person who was affected.",
    whenToUse: "When someone withdraws, is ignored, is corrected sharply, or has an uncomfortable interaction online.",
    example: "“I noticed the interaction in the channel earlier and just wanted to check in. How are you doing?”",
  },
};

// Which D (or "off-framework") each option maps to, for the xAPI dPathway
// extension (F3 / completed statements). Internal xAPI metadata only,
// invisible to learners.
export const dPathwayMap = {
  4: { A: "Direct", B: "Delay", C: "off-framework" },
  6: { A: "Direct", B: "Distract", C: "Delay" },
  8: { A: "Direct", B: "off-framework", C: "Delegate" },
  10: { A: "off-framework", B: "Document", C: "off-framework", D: "Direct" },
  12: { A: "Direct", B: "Distract", C: "Delay", D: "off-framework" },
};

// Synthetic baseline percentages for the debrief's "You and X% of people
// chose to..." comparison line, per the baseline-methodology doc (persona
// set + 0.8-adherence formula). `choice` text reflects the finalized copy
// for each option.
// Formula: percentage = [k×0.8 + (5−k)×(0.2/(m−1))] / 5, k = personas
// picking that option (of 5), m = option count on that screen.
export const debriefBaselines = {
  4: {
    situation: "a stereotype went unanswered in a busy Slack channel",
    options: {
      A: { percent: 52.0, choice: "respond directly in the channel" },
      B: { percent: 24.0, choice: "check in with your colleague privately" },
      C: { percent: 24.0, choice: "forward the message to your manager" },
    },
  },
  6: {
    situation: "a colleague was interrupted twice in a meeting and went quiet",
    options: {
      A: { percent: 24.0, choice: "call out the person interrupting" },
      B: { percent: 52.0, choice: "ask the facilitator to return to your colleague" },
      C: { percent: 24.0, choice: "send a message after the meeting" },
    },
  },
  // Votes behind the percentages above (of 5 personas): Names it→A (1),
  // Escalates to authority→C (no authority option exists, defaults to
  // best-fit), Keeps it private→C (1), Weighs exposure→C (defaults, F4
  // Low), Applies framework→C (1). k(A)=1, k(B)=0, k(C)=4, m=3.
  8: {
    situation: "a senior manager’s correction went out reply-all, CC’d to directors",
    options: {
      A: { percent: 24.0, choice: "call out the manager" },
      B: { percent: 10.0, choice: "acknowledge the correction and move on" },
      C: { percent: 66.0, choice: "check in with your colleague privately" },
    },
  },
  // Votes behind the percentages above (of 5 personas): Names it→D (most
  // direct/confrontational, even unsafe), Escalates to authority→A (routes
  // to their manager), Keeps it private→B (stays contained, no third
  // party), Weighs exposure→B (defaults, F4 Low here), Applies
  // framework→B (best fit). k(A)=1, k(B)=3, k(C)=0, k(D)=1, m=4.
  10: {
    situation: "a colleague disclosed a recurring comment about their accent",
    options: {
      A: { percent: 21.3, choice: "offer to report it to their manager" },
      B: { percent: 50.7, choice: "offer to keep an eye out for them" },
      C: { percent: 6.7, choice: "reassure them it probably wasn’t intentional" },
      D: { percent: 21.3, choice: "offer to confront the person directly" },
    },
  },
  12: {
    situation: "a comment about someone’s appearance went unaddressed on a call",
    options: {
      A: { percent: 65.3, choice: "address it and follow up privately" },
      B: { percent: 6.7, choice: "redirect the conversation to the agenda" },
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
      // No "your progress isn't saved" warning anywhere in this module, on
      // any screen — a deliberate scope call, not a gap.
      advanceLabel: "Start",
    },
  },

  // ---- Screen 2 — Introduction ------------------------------------------
  {
    id: 2,
    component: "StatementScreen",
    // weighted: true so the header band renders consistently with the
    // other non-splash screens — h1/.screen__body p/.btn-continue are all
    // safe as text on the darker background here (unlike
    // .scenario-eyebrow/.validation-message on scenario screens).
    weighted: true,
    data: {
      // Renders via .intro-illustration (styles.css): full, uncropped 1:1
      // source art, width-driven and centered, sized down from the splash
      // hero so it doesn't compete with it.
      illustration: "Remote-Team--Streamline-Brooklyn.svg",
      headline: "What is Online Bystander Intervention?",
      body: [
        "Online bystander intervention is the act of safely supporting someone who may be experiencing harm and responding in ways that maintain respect and inclusion in a digital environment.",
        "In this 10-minute learning experience, you’ll practice applying the 5Ds of active bystander intervention. You’ll encounter workplace situations where colleagues are mistreated and you can choose actions to help.",
      ],
      advanceLabel: "Continue",
    },
  },

  // ---- Screen 3 — Power Dynamics -----------------------------------------
  // Renders the header like Screen 2: back control + title + neutral track
  // — StatementScreen's currentDIndex() returns null for this screen, so
  // the track is always unfilled, no special-casing needed. Uses the same
  // .intro-illustration pattern as Screen 2's header image.
  {
    id: 3,
    component: "StatementScreen",
    weighted: true,
    data: {
      illustration: "Video-Conference-4--Streamline-Brooklyn.svg",
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
      // No explicit [Continue] bracket for this screen in the learner-copy
      // source doc — kept as a reasonable default, since every
      // non-terminal screen needs an advance control.
      advanceLabel: "Continue",
    },
  },

  // ---- Screen 4 — Scenario 1: Slack stereotype (Direct) ------------------
  {
    id: 4,
    component: "ScenarioScreen",
    weighted: true,
    scenarioNumber: 1,
    // Escalating the target's situation to a manager without asking first —
    // flagged per the FDD's A6 error pattern (E4/E6).
    flagOptions: ["C"],
    data: {
      illustration: "scenario-1-puzzle-piece.svg",
      shortTitle: "Stereotype in the chat",
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
    weighted: true,
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
          text: "Ask the facilitator to come back to your colleague.",
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
    weighted: true,
    scenarioNumber: 3,
    // None of the three options here is an unconsented escalation-to-
    // authority move, so this scenario carries no flagOptions.
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
    weighted: true,
    scenarioNumber: 4,
    // Escalating to the target's manager without asking first — same FDD
    // A6 pattern as Screen 4/C above.
    flagOptions: ["A"],
    data: {
      illustration: "scenario-4-puzzle-piece.svg",
      shortTitle: "Mimicking an accent",
      stem:
        "At the end of a virtual 1:1 video call, your colleague discloses that someone else on the team has been subtly mocking and mimicking their pronunciation of certain terminology because of their accent. It's occurred on a few occasions, but you haven't witnessed it yet yourself.",
      question: "What's the most useful way to respond?",
      options: [
        {
          id: "A",
          text: "Offer to loop in their manager so someone with authority can step in.",
          feedback:
            "The instinct to tell their manager shows that you are taking this situation seriously, but it's a decision that should be made in consultation with the person affected.",
        },
        {
          id: "B",
          correct: true,
          text: "Ask if they'd like you to keep an eye out and report what you see.",
          feedback:
            "Yes, by asking first, you allow the person affected to make the decision about how they want to proceed. Your offer to keep an eye out for them and note what you see is the right kind of support here.",
        },
        {
          id: "C",
          text: "Tell them the coworker probably didn't mean anything by it.",
          feedback:
            "Reframing the coworker's intent doesn't acknowledge what your colleague just disclosed to you. They've told you that this has happened more than once and it's bothering them.",
        },
        {
          id: "D",
          text: "Call it unacceptable and say you'll confront the coworker.",
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
    weighted: true,
    scenarioNumber: 5,
    data: {
      illustration: "scenario-5-puzzle-piece.svg",
      shortTitle: "Comment about appearance",
      stem:
        "During a video call, someone makes a comment about a teammate's appearance. Your teammate laughs it off with a visibly uncomfortable expression, turns their camera off, and stays quiet for the rest of the call. The call proceeds without anyone addressing it.",
      question: "Which combined response would be most effective?",
      options: [
        {
          id: "A",
          correct: true,
          text: "Address it briefly in the meeting, then message them privately.",
          feedback:
            "Yes, responding in the meeting resets the norm for everyone who saw it, and the private message reaches the person it actually happened to. Public harm and personal impact are two different problems and this response addresses both.",
        },
        {
          id: "B",
          // Not a plain miss — the copy explicitly calls this "also
          // defensible," distinct from C/D's outright critique. Gets its
          // own feedback tier (render.js), not folded into "best-fit" or
          // "worth a second look."
          defensible: true,
          text: "Redirect to the agenda, then check in with them privately.",
          feedback:
            "This is a reasonable read. Redirecting protects your teammate from more attention in the moment, and checking in privately afterward reaches them directly. What it gives up is the peer signal: the group hears the subject change but not that anyone thought the comment was a problem.",
        },
        {
          id: "C",
          text: "Check in with your teammate privately after the meeting.",
          feedback:
            "Checking in privately matters and they'll feel it. But the comment happened in front of the team, and your teammate went camera-off in front of the team; handling it only behind the scenes doesn't reset anything for everyone who witnessed it.",
        },
        {
          id: "D",
          text: "Send a private message to whoever made the comment.",
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
  // state.selections + debriefBaselines above, not static here. No
  // reflection-prompt/textarea block — the learner-copy source doc doesn't
  // include one for this screen.
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
