// render.js — component render functions. Each returns a <section> element
// ready to mount into #app. Per Component Architecture Spec v1.4 (doc sweep
// complete, 2026-09-07 — matches this file's actual 14-screen/5-scenario
// behavior): one <h1> per mounted screen, native elements first, the
// feedback panel's role="status" + aria-live="polite" is the one
// deliberate custom-ARIA usage in the whole module.

import { referenceContent, phaseCards } from "./data.js";

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== false && v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function backButton(onBack) {
  if (!onBack) return null;
  return el("button", { type: "button", class: "btn-back", onclick: onBack }, "← Back");
}

function referenceDisclosure(screenId, onOpen) {
  const dl = el(
    "dl",
    {},
    referenceContent.flatMap((r) => [el("dt", {}, r.d), el("dd", {}, r.text)])
  );
  const details = el("details", { class: "reference" }, [
    el("summary", {}, "The 5Ds"),
    dl,
  ]);
  details.addEventListener("toggle", () => {
    if (details.open) onOpen(screenId);
  });
  return details;
}

// Formats a baseline percentage: whole numbers with no decimal (52%),
// everything else to one decimal place (21.3%) — matches
// DBI-Debrief-Synthetic-Baseline-Methodology-2026-09-01.md's own display
// convention for its worked tables.
function formatPercent(n) {
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`;
}

// ---------------------------------------------------------------------
// StatementScreen — screens 1, 2, 3, and the debrief variant (14)
// ---------------------------------------------------------------------
export function renderStatementScreen(screen, ctx) {
  const { data, weighted, id } = screen;

  if (screen.variant === "splash") {
    const section = el(
      "section",
      {
        class: "screen screen--statement screen--splash",
        "aria-labelledby": `s${id}-title`,
        tabindex: "-1",
      },
      [
        data.illustration
          ? el("img", {
              src: `assets/illustrations/${data.illustration}`,
              alt: "",
              "aria-hidden": "true",
              class: "splash-graphic",
            })
          : null,
        el("h1", { id: `s${id}-title` }, data.headline),
        data.subtitle ? el("p", { class: "splash-subtitle" }, data.subtitle) : null,
        el("button", { type: "button", class: "btn-continue", onclick: ctx.onAdvance }, data.advanceLabel),
      ]
    );
    return section;
  }

  if (screen.variant === "debrief") {
    // comparisonLines is computed by appShell.js at mount time from
    // state.selections + debriefBaselines (data.js) — not static content.
    const comparisonList = el(
      "ul",
      { class: "comparison-list" },
      (data.comparisonLines || []).map((line) => el("li", {}, line))
    );

    const section = el(
      "section",
      {
        class: "screen screen--statement screen--debrief" + (weighted ? " screen--weighted" : ""),
        "aria-labelledby": `s${id}-title`,
        tabindex: "-1",
      },
      [
        el("h1", { id: `s${id}-title` }, data.headline),
        el("p", { class: "intro" }, data.intro),
        comparisonList,
        el("p", { class: "closing" }, data.closingNote),
        el("div", { class: "debrief-actions" }, [
          el("button", { type: "button", class: "btn-secondary", onclick: () => ctx.onRetry() }, data.retryLabel),
          el("button", { type: "button", class: "btn-continue", onclick: () => ctx.onExit() }, data.exitLabel),
        ]),
      ]
    );

    // Exit swaps both buttons for a short closing note — this is a
    // standalone page with no further screens and no save, so there's
    // nothing else for either control to do once the learner is done.
    // Retry resets in-memory state and restarts at Screen 1.
    const actions = section.querySelector(".debrief-actions");
    ctx.onExit = () => {
      actions.innerHTML = "";
      actions.appendChild(el("p", { class: "exit-note" }, data.exitNote));
    };
    return section;
  }

  const bodyChildren = (data.body || []).map((p) => el("p", {}, p));

  const children = [
    backButton(ctx.canGoBack ? ctx.onBack : null),
    data.icon
      ? el("img", { src: `assets/icons/${data.icon}`, alt: "", "aria-hidden": "true", class: "icon-risk" })
      : null,
    el("h1", { id: `s${id}-title` }, data.headline),
    el("div", { class: "screen__body" }, bodyChildren),
  ];

  if (data.powerQuestions) {
    const pq = el(
      "div",
      { class: "power-questions" },
      data.powerQuestions.map((q) =>
        el("div", { class: "power-question" }, [
          el("p", {}, [el("strong", {}, `${q.n}. ${q.text}`)]),
          q.note ? el("p", {}, q.note) : null,
        ])
      )
    );
    children.push(pq);
  }

  if (data.bodyAfter) {
    children.push(el("div", { class: "screen__body" }, data.bodyAfter.map((p) => el("p", {}, p))));
  }

  children.push(el("button", { type: "button", class: "btn-continue", onclick: ctx.onAdvance }, data.advanceLabel));

  return el(
    "section",
    {
      class: "screen screen--statement" + (weighted ? " screen--weighted" : ""),
      "aria-labelledby": `s${id}-title`,
      tabindex: "-1",
    },
    children
  );
}

// ---------------------------------------------------------------------
// PhaseCardScreen — screens 5, 7, 9, 11, 13. One D per screen, earned
// progressively after its scenario. Same visual card language as the old
// CardGridScreen's grid (now removed — nothing else uses it), single card
// instead of five.
// ---------------------------------------------------------------------
export function renderPhaseCardScreen(screen, ctx) {
  const { data, id } = screen;
  const card = phaseCards[data.d];

  const cardEl = el("div", { class: "card phase-card", style: `--card-color: ${card.color}` }, [
    el("img", { src: `assets/icons/${card.icon}`, alt: "", "aria-hidden": "true", class: "icon-5d" }),
    el("h2", {}, data.d),
    el("p", { class: "phase-card__definition" }, card.definition),
    el("p", { class: "phase-card__label" }, "When to use"),
    el("p", {}, card.whenToUse),
    el("p", { class: "phase-card__label" }, "Example"),
    el("p", { class: "phase-card__example" }, card.example),
  ]);

  return el(
    "section",
    { class: "screen screen--phasecard", "aria-labelledby": `s${id}-title`, tabindex: "-1" },
    [
      el("h1", { id: `s${id}-title`, class: "visually-hidden-optional" }, `${data.d} — card earned`),
      cardEl,
      el("button", { type: "button", class: "btn-continue", onclick: ctx.onAdvance }, data.advanceLabel),
    ]
  );
}

// ---------------------------------------------------------------------
// ScenarioScreen — screens 4, 6, 8, 10, 12
// ---------------------------------------------------------------------
export function renderScenarioScreen(screen, ctx) {
  const { data, id, scenarioNumber, weighted } = screen;

  const stemChildren = [el("p", {}, data.stem)];
  if (data.stemQuote) stemChildren.push(el("blockquote", {}, data.stemQuote));

  const optionLabels = data.options.map((opt) =>
    el("label", {}, [
      el("input", { type: "radio", name: `s${id}`, value: opt.id }),
      el("span", {}, opt.text),
    ])
  );

  const legend = el("legend", {}, data.question);
  const fieldset = el("fieldset", {}, [legend, ...optionLabels]);

  const validationMsg = el("p", { class: "validation-message", hidden: true, role: "alert" }, "");

  const form = el("form", { class: "scenario-form", novalidate: true }, [
    fieldset,
    validationMsg,
  ]);

  if (data.hint) {
    const hintDetails = el("details", { class: "hint" }, [
      el("summary", {}, "Need a hint?"),
      el("div", {}, data.hint),
    ]);
    hintDetails.addEventListener("toggle", () => {
      if (hintDetails.open) ctx.onHintOpen();
    });
    form.appendChild(hintDetails);
  }

  const submitBtn = el("button", { type: "submit", class: "btn-submit" }, data.submitLabel);
  form.appendChild(submitBtn);

  const feedbackPanel = el("div", { class: "feedback", role: "status", "aria-live": "polite", hidden: true });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const selected = form.querySelector('input[type="radio"]:checked');
    if (!selected) {
      validationMsg.textContent = "Choose an option before submitting.";
      validationMsg.hidden = false;
      return;
    }
    validationMsg.hidden = true;
    const optionId = selected.value;
    const option = data.options.find((o) => o.id === optionId);

    ctx.onSubmit(id, scenarioNumber, optionId);

    // Lock the answer after first submit (folded in from PR #1, Row 14,
    // 2026-08-25/26 — that PR predates this rebuild and never merged, so
    // its intent is rebuilt fresh here rather than merged/rebased). All
    // radios disable and Submit hides once feedback renders, so the form
    // can't submit again — trackAnswered() can only fire once per screen
    // by construction, and the debrief's per-scenario selection (recorded
    // in appShell.js state) can't be silently overwritten by a retry.
    fieldset.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.disabled = true;
    });
    submitBtn.hidden = true;

    // Correctness signal (folded in from PR #1, same rationale). Three
    // tiers, not two: `correct` (best-fit), `defensible` (final copy calls
    // out Screen 12/B explicitly as "also defensible," not a plain miss —
    // this is a build-time read of that copy, not new wording), and the
    // default "worth a second look" for everything else. Text label is the
    // real signal; color is reinforcing only.
    const tierClass = option.correct ? "correct" : option.defensible ? "defensible" : "reconsider";
    const tierLabel = option.correct
      ? "Best-fit response"
      : option.defensible
      ? "Also reasonable"
      : "Worth a second look";
    feedbackPanel.className = `feedback feedback--${tierClass}`;
    feedbackPanel.innerHTML = "";
    feedbackPanel.appendChild(el("p", { class: "feedback__signal" }, tierLabel));
    feedbackPanel.appendChild(el("p", {}, option.feedback));
    requestAnimationFrame(() => {
      feedbackPanel.hidden = false;
    });

    if (!ctx.continueShown) {
      ctx.showContinue();
    }
  });

  const children = [
    backButton(ctx.canGoBack ? ctx.onBack : null),
    // Decorative scenario illustration — puzzle-piece treatment, all five
    // scenario screens now (DBI Row 14, closed 2026-09-06). Never carries
    // unique information — the stem text is always the source of truth —
    // so it's alt="" + aria-hidden.
    data.illustration
      ? el("img", {
          src: `assets/illustrations/${data.illustration}`,
          alt: "",
          "aria-hidden": "true",
          class: "scenario-illustration",
        })
      : null,
    el("h1", { id: `s${id}-title`, class: "visually-hidden-optional" }, `Scenario ${scenarioNumber}`),
    data.framingLine ? el("p", {}, [el("strong", {}, data.framingLine)]) : null,
    el("div", { class: "stem" }, stemChildren),
    form,
    feedbackPanel,
    el("div", { class: "continue-holder" }),
    referenceDisclosure(id, ctx.onReferenceOpen),
  ];

  const section = el(
    "section",
    {
      class: "screen screen--scenario" + (weighted ? " screen--weighted" : ""),
      "aria-labelledby": `s${id}-title`,
      tabindex: "-1",
    },
    children
  );

  // Continue control appears the moment feedback renders (not gated on the
  // keyed option — retries are unlimited, module is formative).
  const continueHolder = section.querySelector(".continue-holder");
  ctx.continueShown = false;
  ctx.showContinue = () => {
    ctx.continueShown = true;
    continueHolder.innerHTML = "";
    continueHolder.appendChild(
      el("button", { type: "button", class: "btn-continue", onclick: ctx.onAdvance }, "Continue")
    );
  };

  return section;
}

export function renderScreen(screen, ctx) {
  switch (screen.component) {
    case "StatementScreen":
      return renderStatementScreen(screen, ctx);
    case "PhaseCardScreen":
      return renderPhaseCardScreen(screen, ctx);
    case "ScenarioScreen":
      return renderScenarioScreen(screen, ctx);
    default:
      throw new Error(`Unknown component: ${screen.component}`);
  }
}

export { formatPercent };
