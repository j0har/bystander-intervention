// data.js — screen content, single ordered array. Screen numbering here is the
// CORRECTED 1–11 scheme (old Screen 7 / Metacognitive Pause is cut; old
// Screens 8–12 renumbered down by one). Source docs (storyboard v1.2,
// component spec v1.3, xAPI spec v1.1) still use the old 12-screen numbering
// internally — this file performs the renumber pass none of them completed.

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

export const cardGridData = [
  {
    d: "Distract",
    color: "var(--color-d-distract)",
    icon: "icon-5d-distract.svg",
    text: "Interrupt the dynamic. Redirect without confrontation — a clarifying question, a subject change.",
  },
  {
    d: "Delegate",
    color: "var(--color-d-delegate)",
    icon: "icon-5d-delegate.svg",
    text: "Bring in the right support — but only at the target’s request.",
  },
  {
    d: "Document",
    color: "var(--color-d-document)",
    icon: "icon-5d-document.svg",
    text: "Preserve information carefully. Always ask what they want done with it; never use it without permission.",
  },
  {
    d: "Delay",
    color: "var(--color-d-delay)",
    icon: "icon-5d-delay.svg",
    text: "Check in privately, afterward. The moment passing doesn’t mean the option is gone.",
  },
  {
    d: "Direct",
    color: "var(--color-d-direct)",
    icon: "icon-5d-direct.svg",
    text: "Address the behaviour respectfully, in the space it happened — when it’s safe and when they’d want it.",
  },
];

// Which D (or "off-framework") each option maps to, for the xAPI dPathway
// extension (F3 / completed statements). Not supplied by any source doc for
// any screen — populated here at build time. Screens 6 and 9 are
// intentionally omitted: neither is a selection-among-Ds item (6 is
// self-implication, 9 measures execution within Delay only), so tagging a D
// pathway for them would misrepresent the cohort-trend signal this map
// exists to produce. Screen 10 (capstone) is a combination-response item;
// tagged with its most prominent D as a judgment call — flagged as an open
// design question, same status as the source docs' own unresolved items.
export const dPathwayMap = {
  4: { A: "Direct", B: "Delay", C: "off-framework" },
  5: { A: "Direct", B: "Delegate", C: "Delay" },
  7: { A: "Direct", B: "off-framework", C: "Delegate", D: "off-framework" },
  8: { A: "Direct", B: "off-framework", C: "Distract", D: "off-framework" },
  10: { A: "Direct", B: "Distract", C: "Delay", D: "off-framework" },
};

// screens[] — the single ordered source of truth AppShell iterates over.
// component: 'StatementScreen' | 'CardGridScreen' | 'ScenarioScreen'
export const screens = [
  // ---- Screen 1 — Introduction ---------------------------------------
  {
    id: 1,
    component: "StatementScreen",
    weighted: false,
    data: {
      headline: "Notice. Choose. Support.",
      body: [
        "You’ve already worked through digital bystander intervention in a full-day session. This is a short refresher — a chance to use the 5Ds again on situations that look like your actual week. Most collaboration now happens in chat threads, email, shared files and video calls. These tools create moments where someone gets sidelined, a comment lands wrong, or a message reads sharper than it was meant to.",
        "Over the next few minutes you’ll work through familiar situations and choose how to respond — without formal authority, without escalating harm, using tools you already have. The 5Ds stay open beside you the whole way.",
        "This takes about 13 minutes. If you reload or navigate away you’ll start over — there’s no save.",
      ],
      advanceLabel: "Continue",
    },
  },

  // ---- Screen 2 — Framework (5Ds) reactivation -----------------------
  {
    id: 2,
    component: "CardGridScreen",
    weighted: false,
    data: {
      framingLine: "You know these five. Here they are again, in their digital form.",
      intro:
        "Every one of these tools still works, even the ones that don’t feel urgent. Following up privately days later (Delay) still counts as intervention. There’s no expiry on caring.",
      cards: cardGridData,
      closing: "These aren’t ranked. Which one fits depends on the situation, not on a hierarchy.",
      advanceLabel: "Continue",
    },
  },

  // ---- Screen 3 — Risk assessment / two power questions ---------------
  {
    id: 3,
    component: "StatementScreen",
    weighted: true,
    data: {
      headline: "Before You Act: Two Different Power Questions",
      icon: "icon-risk-assessment.svg",
      body: [
        "The same response can be low-risk for one person and career-limiting for another. Before choosing, ask two questions — they’re not the same question, and they don’t always have the same answer.",
      ],
      powerQuestions: [
        {
          n: 1,
          text: "Does the person doing harm have power over the person being harmed?",
          note: "That shapes how exposed the target already is, and what a public response would cost them.",
        },
        {
          n: 2,
          text: "Does the person doing harm have power over you?",
          note: "That shapes what’s safe for you to do. You can be safe while the target isn’t, or the reverse.",
        },
      ],
      bodyAfter: [
        "Then ask what the target has actually said or shown they want, and where the harm happened — who saw it. Choosing not to act publicly isn’t failure. Documenting, delaying, or checking in privately are real responses when a direct one isn’t safe.",
      ],
      advanceLabel: "Continue",
    },
  },

  // ---- Screen 4 — Scenario 1: Slack Stereotype (ASSESSED) -------------
  {
    id: 4,
    component: "ScenarioScreen",
    scenarioNumber: 1,
    scored: true,
    // "Hard-fail-set" instance #1 (shared root error with Screen 7's D):
    // delegating the target's situation to authority without asking first.
    // Whether this actually scores as a hard-fail at this lower severity is
    // an open, undecided question per every source doc — tracked in
    // hardFailFlags regardless so the data exists if/when that's resolved.
    hardFailOptions: ["C"],
    data: {
      // DBI Row 14, 2026-08-26: illustration added — Streamline Brooklyn
      // family, mapped by Johar against this scenario's Slack-channel /
      // busy-thread setting. Placeholder geometry ships in this PR pending
      // the real recolored Brooklyn export (see PR description).
      illustration: "scenario-4-slack-stereotype.svg",
      stem:
        "Your team has a busy Slack channel — usually pretty active, lots of quick back-and-forth. A colleague posts a meme with a regional stereotype. Another colleague — who’s usually very active in this channel — replies ‘not sure that one lands’ and gets no response. The thread moves on. They haven’t posted since.",
      question: "What’s the most appropriate way to respond?",
      options: [
        {
          id: "A",
          text: "Reply in the channel with a brief comment addressing the stereotype.",
          feedback:
            "Yes — answering in the same space where it happened is what resets the norm. Your colleague already said something and got nothing back; everyone still in that channel read the silence as agreement. Match the visibility of your response to the visibility of the harm.",
        },
        {
          id: "B",
          text: "Message the colleague who spoke up privately to check in.",
          feedback:
            "Checking in privately is worth doing regardless — but it leaves the meme sitting there unanswered in front of everyone who saw it, including the colleague who spoke up alone. Private support and a public response aren’t alternatives here; the public comment specifically needs a public answer.",
        },
        {
          id: "C",
          text: "Forward the thread to your team manager and ask them to address it with the poster.",
          feedback:
            "Forwarding the thread hands your colleague’s situation to someone with authority over it, before they’ve said that’s what they want. That’s the same move as taking it to HR — just at a smaller scale. It also skips a lower-friction response that was available to you as a peer. Asking them first is what separates support from taking over.",
        },
      ],
      submitLabel: "Submit",
    },
  },

  // ---- Screen 5 — Scenario 2: Meeting Interruption (ASSESSED) ---------
  {
    id: 5,
    component: "ScenarioScreen",
    scenarioNumber: 2,
    scored: true,
    data: {
      illustration: "scenario-5-meeting-interruption.svg",
      stem:
        "In a team meeting, a colleague tries to share an idea but is interrupted. They try again a few minutes later — interrupted again. The facilitator doesn’t notice. Your colleague goes quiet for the rest of the meeting.",
      question: "What’s the best way to respond?",
      options: [
        {
          id: "A",
          text: "Call out the person who interrupted directly.",
          feedback:
            "Naming the interrupter directly can work, but there’s a lower-friction option right there — the facilitator can redirect with less cost to everyone, including your colleague, who now has a conflict happening about them.",
        },
        {
          id: "B",
          text: "Use the chat, or speak up, to suggest the facilitator come back to your colleague.",
          feedback:
            "Yes — the facilitator has the standing to redirect the floor, and a nudge costs your colleague nothing. It gets them back into the conversation while their idea can still land, without putting you in direct conflict with a peer. Worth noticing: why do you think this one felt like it didn’t need a response?",
        },
        {
          id: "C",
          text: "Wait until after the meeting to send a private message.",
          feedback:
            "Checking in afterward is a real option, but not instead of this one. Your colleague is still in the meeting and the conversation is still live; waiting means their idea doesn’t get heard today at all. A message after can acknowledge what happened — it can’t get them back into the room.",
        },
      ],
      submitLabel: "Submit",
    },
  },

  // ---- Screen 6 — Scenario 3: Shared Document Conflict (TAUGHT) -------
  {
    id: 6,
    component: "ScenarioScreen",
    scenarioNumber: 3,
    scored: false,
    weighted: true,
    data: {
      framingLine: "This one isn’t scored — it’s here because it’s the one situation where you’re the one who might cause the problem.",
      stem:
        "You’re working on a shared document with your team. A colleague added a section that directly contradicts your approach. You have edit access.",
      question: "Before making changes, what should you do?",
      options: [
        {
          id: "A",
          text: "Delete their section, add yours, leave a comment explaining.",
          feedback:
            "Explaining afterward still means the call was made before they had a say. Even with a considerate comment attached, a unilateral edit in a shared space reads as a judgment on the time they put in.",
        },
        {
          id: "B",
          text: "Add a comment flagging the discrepancy and suggesting you discuss it.",
          feedback:
            "Yes — flagging it and inviting the conversation keeps your colleague in a decision that affects their work. Bystander intervention isn’t only about responding to what others do; it’s also about not being the person who quietly overrides someone.",
        },
        {
          id: "C",
          text: "Leave both versions and let the team decide later.",
          feedback:
            "Leaving both avoids friction now, but the contradiction still has to be resolved — probably later, with less time and more at stake for whoever ends up doing it.",
        },
      ],
      submitLabel: "Submit",
    },
  },

  // ---- Screen 7 — Scenario 4: Reply-All Power Dynamics (ASSESSED) -----
  {
    id: 7,
    component: "ScenarioScreen",
    scenarioNumber: 4,
    scored: true,
    // Hard-fail-set instance #2 — same root error as Screen 4's C, at
    // higher severity ("the most serious error here" per feedback copy).
    hardFailOptions: ["D"],
    data: {
      illustration: "scenario-7-reply-all.svg",
      stem:
        "A senior manager sends a reply-all email correcting a junior staff member’s work. The tone is sharp, the email is CC’d to directors, and the junior staff member stops responding in the thread.",
      question: "Given what’s safe for you to do here, what’s the best action?",
      options: [
        {
          id: "A",
          text: "Reply-all noting that the tone could be more constructive.",
          feedback:
            "Naming the tone publicly keeps the correction — and their discomfort — in front of the same wide, CC’d distribution. It’s aimed at the manager, but it lands on them too.",
        },
        {
          id: "B",
          text: "Reply-all acknowledging the correction and shifting the thread toward next steps.",
          feedback:
            "Shifting to next steps keeps things running and quietly signals the public correction was fine. Everyone else gets to move on; the person it happened to watched it happen in front of directors.",
        },
        {
          id: "C",
          text: "Send a private message to the junior staff member offering support and asking if they want you to route this to their leader or HR.",
          feedback:
            "Yes — asking first leaves the decision with the person it’s actually about. They’re the one who has to keep working with this manager, and they’re the only one who knows what they can afford. Where someone has power over the person being harmed, start by finding out what they want, not by deciding for them.",
        },
        {
          id: "D",
          text: "Forward the email to HR immediately without speaking to the junior staff member first.",
          feedback:
            "Escalating to HR before they’ve had any say takes the decision entirely out of their hands, in a situation that is specifically about them. It’s the same move as forwarding a thread to a manager, at a much higher cost — their account of what happened now enters a process they didn’t choose and can’t withdraw from. Asking first is what separates support from taking over.",
        },
      ],
      submitLabel: "Submit",
    },
  },

  // ---- Screen 8 — NEW: Responder-Risk item (ASSESSED) ------------------
  // Content authored here — no upstream deliverable exists (flagged in the
  // build brief as the one genuine content gap in the whole set). Required
  // stem properties (setting, artifacts, roles, closing condition) taken
  // verbatim from the FDD's spec; options/key/feedback are new, built to
  // the two mandatory distractors (no-action → E1, Direct-anyway → E9)
  // and keyed Distract per the brief's DM-panel / F4-decisive framing.
  {
    id: 8,
    component: "ScenarioScreen",
    scenarioNumber: 5,
    scored: true,
    data: {
      illustration: "scenario-8-responder-risk.svg",
      stem:
        "In a cross-department Slack channel, mid-workday, a department head posts a dismissive message about a colleague’s work — two levels above you, and in your reporting line. Your colleague replies briefly, then goes quiet. Nobody else responds. You have the DM panel open.",
      question: "Direct is genuinely unsafe for you here. The target isn’t asking you to stay quiet. What do you do?",
      options: [
        {
          id: "A",
          text: "Reply in the channel, addressing the comment directly.",
          feedback:
            "This is Direct — and Direct is exactly what’s unsafe for you here. The department head is two levels above you and in your reporting line; a public challenge exposes you to exactly the kind of retaliation that risk assessment exists to catch. Safety for you isn’t a technicality — it’s the gate.",
        },
        {
          id: "B",
          text: "Send the department head a private message explaining why the comment landed badly.",
          feedback:
            "Moving it to a DM lowers the audience, but the exposure is still yours to carry — you’re still the one telling someone two levels up, in your own reporting line, that they got it wrong. The risk isn’t about who else sees it; it’s about who you’re answerable to afterward.",
        },
        {
          id: "C",
          text: "Send your colleague a private message checking in and asking if there’s anything they’d want you to do.",
          feedback:
            "Yes — this doesn’t put you in front of someone who outranks you, and it doesn’t decide anything on your colleague’s behalf. It opens the door without asking them to carry the cost of your exposure, and leaves what happens next with the person it actually affects.",
        },
        {
          id: "D",
          text: "Take no action — it’s not your place to get involved.",
          feedback:
            "Not acting is the response risk assessment predicts most often here, and it isn’t a character failure — the freeze response is physiological. But your colleague still went quiet after being dismissed in front of the whole channel, with nobody answering it. A safe option existed; this wasn’t the only one available.",
        },
      ],
      submitLabel: "Submit",
    },
  },

  // ---- Screen 9 — Scenario 5: Boundary Respect (TAUGHT) ----------------
  {
    id: 9,
    component: "ScenarioScreen",
    scenarioNumber: 6,
    scored: false,
    weighted: true,
    data: {
      framingLine: "Not scored — this one’s about how a response lands, not which one you pick.",
      stem:
        "After a sharp exchange in a group chat, you send a DM to check in with someone. They reply:",
      stemQuote: "“I don’t want to think about work right now.”",
      question: "What’s the best way to respond?",
      options: [
        {
          id: "A",
          text: "“That’s completely understandable — I’m here if you need anything later. What happened wasn’t okay.”",
          feedback:
            "Yes — you took them at their word and still made it clear you didn’t think what happened was fine. They asked for space, not for you to disagree with them about whether it mattered. The door’s open on their timing.",
        },
        {
          id: "B",
          text: "“I really think you should report this. It wasn’t acceptable.”",
          feedback:
            "The advice itself isn’t wrong — but they’ve just told you what they need right now, and this pushes past it. Reporting stays available whenever they decide they want it.",
        },
        {
          id: "C",
          text: "“Try not to take it personally — that’s just how they communicate sometimes.”",
          feedback:
            "‘That’s just how they communicate’ explains the behaviour away, and they’ve just described it as something that landed badly. It asks them to carry it quietly.",
        },
        {
          id: "D",
          text: "“Can you tell me more about what happened? I want to understand your perspective.”",
          feedback:
            "Asking for detail is well-intentioned, but it’s still asking them to think about work right now — the one thing they said they didn’t want. Curiosity can wait; the boundary is the thing to answer.",
        },
      ],
      submitLabel: "Submit",
    },
  },

  // ---- Screen 10 — Scenario 6: Appearance Comment (ASSESSED, capstone) -
  {
    id: 10,
    component: "ScenarioScreen",
    scenarioNumber: 7,
    scored: true,
    data: {
      illustration: "scenario-10-appearance-comment.svg",
      stem:
        "During a video call, someone makes a comment about a teammate’s appearance. Your teammate laughs it off with a visibly uncomfortable expression, turns their camera off, and stays quiet for the rest of the call — unusual for them. The call moves on without anyone addressing it.",
      question: "Which combination would be most effective?",
      hint: "Sometimes one action isn’t enough — think about what resets things for the group and what supports the person it happened to.",
      options: [
        {
          id: "A",
          text: "Address the comment briefly in the meeting and send a private message afterward.",
          feedback:
            "Yes — a brief acknowledgment in the call resets the norm for everyone who saw it, and the private message reaches the person it actually happened to. Public harm and personal impact are two different problems; this answers both. Option B could also work — the difference is whether the team needs to hear that a peer thought the comment wasn’t okay, not just that the conversation moved on.",
        },
        {
          id: "B",
          text: "Redirect the conversation to the agenda in chat and check in with your teammate privately afterward.",
          feedback:
            "This is a reasonable read. Redirecting protects your teammate from more attention in the moment, and checking in privately afterward reaches them directly. What it gives up is the peer signal — the group hears the subject change but not that anyone thought the comment was a problem.",
        },
        {
          id: "C",
          text: "Send a private message after the meeting only.",
          feedback:
            "Checking in privately matters and they’ll feel it. But the comment happened in front of the team, and your teammate went camera-off in front of the team; handling it only behind the scenes doesn’t reset anything for everyone who witnessed it.",
        },
        {
          id: "D",
          text: "Send a private message to the person who made the comment.",
          feedback:
            "This talks about your teammate without ever talking to them. The person who was affected gets no signal that anyone noticed, and the response happens somewhere they can’t see it. Support that never reaches the person it’s for isn’t support yet.",
        },
      ],
      submitLabel: "Submit",
    },
  },

  // ---- Screen 11 — Conclusion / Debrief --------------------------------
  {
    id: 11,
    component: "StatementScreen",
    variant: "debrief",
    weighted: true,
    data: {
      headline: "Wrap-up",
      summary: "Here’s how your choices came out across the five scenarios that were scored.",
      narrative: [
        "A colleague who gets a same-day nudge back into a meeting gets to finish saying what they came to say.",
        "When a comment lands badly and someone answers it, people watching learn this channel answers things — when nobody does, they learn that too.",
        "Someone followed up with days later still knows someone noticed, even after the moment passed.",
      ],
      principle: "The 5Ds aren’t ranked. What fits depends on what the person wants, who saw it, and what’s safe for you.",
      reflectionPrompt: "Which of today’s seven situations felt most familiar to you?",
      implementationLabel: "I’ll pay attention to [interruptions in meetings / sharp email tone / chat dynamics] and I’m planning to try [Distract / Delegate / Document / Delay / Direct].",
      noSaveNote: "This isn’t saved — write down anything you want to keep.",
      advanceLabel: "Finish",
    },
  },
];

export const totalScreens = screens.length;
