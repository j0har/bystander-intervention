// Component render functions; each returns a <section> ready to mount into
// #app, with one <h1> per screen. Native elements come first: custom ARIA is
// limited to the feedback panel (role="status", aria-live="polite") and the
// validation message (role="alert").

import { phaseCards } from "./data.js?v=20260915d";

export function el(tag, attrs = {}, children = []) {
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

// Whole numbers render with no decimal (52%), everything else to one decimal
// place (21.3%).
function formatPercent(n) {
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`;
}

// D order, read from phaseCards' key order so it can't drift from
// appShell.js's D_ORDER. Drives the in-card track and the "N of 5" position.
const D_ORDER = Object.keys(phaseCards);

// StatementScreen: splash, introduction, power dynamics and the debrief variant.
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
    // comparisonLines is computed by appShell.js at mount time, not stored in
    // data.js. Each entry is {percent, choice, situation, color, illustration};
    // `color` is the left-edge D-color, or the neutral text token for an
    // off-framework pick.
    const comparisonList = el(
      "ul",
      { class: "comparison-list" },
      (data.comparisonLines || []).map((line) =>
        el("li", { style: `--line-color: ${line.color}` }, [
          line.illustration
            ? el("div", {
                class: "comparison-illustration",
                style: `background-image:url('assets/illustrations/${line.illustration}')`,
                "aria-hidden": "true",
              })
            : null,
          el("p", {}, [
            "You and ",
            el("strong", { class: "comparison-percent" }, line.percent),
            ` of people chose to ${line.choice} when ${line.situation}.`,
          ]),
        ])
      )
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
          el("button", { type: "button", class: "btn-continue debrief-retry", onclick: () => ctx.onRetry() }, data.retryLabel),
          el("button", { type: "button", class: "btn-secondary debrief-exit", onclick: () => ctx.onExit() }, data.exitLabel),
        ]),
      ]
    );

    // Exit swaps both buttons for a closing note, since a standalone page has
    // nowhere further to go.
    const actions = section.querySelector(".debrief-actions");
    ctx.onExit = () => {
      actions.innerHTML = "";
      actions.appendChild(el("p", { class: "exit-note" }, data.exitNote));
    };
    return section;
  }

  const bodyChildren = (data.body || []).map((p) => el("p", {}, p));

  const children = [
    data.illustration
      ? el("img", {
          src: `assets/illustrations/${data.illustration}`,
          alt: "",
          "aria-hidden": "true",
          class: "intro-illustration",
        })
      : null,
    data.icon
      ? el("img", { src: `assets/icons/${data.icon}`, alt: "", "aria-hidden": "true", class: "icon-risk" })
      : null,
    el("h1", { id: `s${id}-title` }, data.headline),
    el("div", { class: "screen__body" }, bodyChildren),
  ];

  if (data.powerQuestions) {
    // <ol>/<li> gives assistive tech the real "1 of 2 / 2 of 2" position;
    // the visible numbered badge is pure CSS generated content (styles.css's
    // counter-based .power-question::before) — decoration layered on top of
    // real list semantics, not a second copy of the number.
    const pq = el(
      "ol",
      { class: "power-questions" },
      data.powerQuestions.map((q) =>
        el("li", { class: "power-question" }, [
          el("p", {}, q.text),
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

// PhaseCardScreen: one D per screen, earned progressively after its scenario.
// The header track is decorative and aria-hidden; the <h1> is the progress
// signal for assistive tech. The eyebrow reads `The Five Ds · N of 5` and
// styles.css uppercases it. The separator is a middot, since learner copy
// takes no em dashes, and "Five" is spelled out because "5Ds" beside "N of 5"
// risks a digit/letter misread.
export function renderPhaseCardScreen(screen, ctx) {
  const { data, id } = screen;
  const card = phaseCards[data.d];
  const curIdx = D_ORDER.indexOf(data.d);
  const position = curIdx + 1;
  const total = D_ORDER.length;

  const track = el(
    "div",
    { class: "phase-card__track", "aria-hidden": "true" },
    D_ORDER.map((d, i) =>
      el("div", {
        class: "phase-card__track-part" + (i <= curIdx ? " phase-card__track-part--done" : ""),
      })
    )
  );

  const header = el("div", { class: "phase-card__header" }, [
    track,
    el("div", { class: "phase-card__header-content" }, [
      el("div", { class: "phase-card__icon-disc" }, [
        el("img", { src: `assets/icons/${card.icon}`, alt: "", "aria-hidden": "true", class: "icon-5d" }),
      ]),
      el("div", { class: "phase-card__header-text" }, [
        el("p", { class: "phase-card__eyebrow" }, `The Five Ds · ${position} of ${total}`),
        el("h2", {}, data.d),
      ]),
    ]),
  ]);

  const body = el("div", { class: "phase-card__body" }, [
    el("p", { class: "phase-card__definition" }, card.definition),
    el("div", { class: "phase-card__section" }, [
      el("p", { class: "phase-card__label" }, "When to use"),
      el("p", {}, card.whenToUse),
    ]),
    el("div", { class: "phase-card__section phase-card__section--example" }, [
      el("p", { class: "phase-card__label" }, "Example"),
      el("p", { class: "phase-card__example" }, card.example),
    ]),
  ]);

  const cardEl = el("div", { class: "phase-card", style: `--card-color: ${card.color}` }, [header, body]);

  return el(
    "section",
    { class: "screen screen--phasecard", "aria-labelledby": `s${id}-title`, tabindex: "-1" },
    [
      el(
        "h1",
        { id: `s${id}-title`, class: "visually-hidden-optional" },
        `Card ${position} of ${total} earned: ${data.d}`
      ),
      cardEl,
      el("button", { type: "button", class: "btn-continue", onclick: ctx.onAdvance }, data.advanceLabel),
    ]
  );
}

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

    // Locks the answer after first submit: radios disable and Submit hides
    // once feedback renders, so the selection can't change until the screen
    // remounts.
    fieldset.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.disabled = true;
    });
    submitBtn.hidden = true;

    // Three feedback tiers: `correct` (best-fit), `defensible` (a legitimate
    // alternative), and the default for everything else. The text label is
    // the signal; color only reinforces. Labels are the learner's own
    // judgment ("A good call" / "A reasonable trade-off" / "A missed
    // opportunity"), since more than one option can be legitimate.
    const tierClass = option.correct ? "correct" : option.defensible ? "defensible" : "reconsider";
    const tierLabel = option.correct
      ? "A good call"
      : option.defensible
      ? "A reasonable trade-off"
      : "A missed opportunity";
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

  // Illustration and eyebrow share one row of set size so the question is
  // visible without scrolling. The eyebrow is the screen's accessible name;
  // aria-labelledby points at eyebrow and title so it reads "Scenario N of 5,
  // <title>".
  const scenarioMeta = el("div", { class: "scenario-meta" }, [
    data.illustration
      ? el("img", {
          src: `assets/illustrations/${data.illustration}`,
          alt: "",
          "aria-hidden": "true",
          class: "scenario-illustration",
        })
      : null,
    el("div", { class: "scenario-meta__text" }, [
      el("h1", { id: `s${id}-title`, class: "scenario-eyebrow" }, `Scenario ${scenarioNumber} of 5`),
      data.shortTitle
        ? el("p", { id: `s${id}-shorttitle`, class: "scenario-title" }, data.shortTitle)
        : null,
    ]),
  ]);

  const children = [
    scenarioMeta,
    data.framingLine ? el("p", {}, [el("strong", {}, data.framingLine)]) : null,
    el("div", { class: "stem" }, stemChildren),
    form,
    feedbackPanel,
    el("div", { class: "continue-holder" }),
  ];

  const section = el(
    "section",
    {
      class: "screen screen--scenario" + (weighted ? " screen--weighted" : ""),
      "aria-labelledby": data.shortTitle ? `s${id}-title s${id}-shorttitle` : `s${id}-title`,
      tabindex: "-1",
    },
    children
  );

  // Continue appears as soon as feedback renders, whichever option the learner picks;
  // the module is formative.
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
