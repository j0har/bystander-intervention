// render.js — component render functions. Each returns a <section> element
// ready to mount into #app. Per Component Architecture Spec v1.3 (renumbered):
// one <h1> per mounted screen, native elements first, the feedback panel's
// role="status" + aria-live="polite" is the one deliberate custom-ARIA
// usage in the whole module.

import { referenceContent } from "./data.js";

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

// ---------------------------------------------------------------------
// StatementScreen — screens 1, 3, and the debrief variant (11)
// ---------------------------------------------------------------------
export function renderStatementScreen(screen, ctx) {
  const { data, weighted, id } = screen;

  if (screen.variant === "debrief") {
    const section = el(
      "section",
      {
        class: "screen screen--statement screen--debrief" + (weighted ? " screen--weighted" : ""),
        "aria-labelledby": `s${id}-title`,
        tabindex: "-1",
      },
      [
        backButton(ctx.canGoBack ? ctx.onBack : null),
        el("h1", { id: `s${id}-title` }, data.headline),
        el("div", { class: "summary" }, el("p", {}, data.summary)),
        el(
          "div",
          { class: "narrative" },
          data.narrative.map((line) => el("blockquote", {}, line))
        ),
        el("div", { class: "principle" }, el("p", {}, data.principle)),
        el("section", { "aria-labelledby": "reflect-h" }, [
          el("h2", { id: "reflect-h" }, "Reflect"),
          el("p", {}, data.reflectionPrompt),
        ]),
        el("label", { for: "impl" }, data.implementationLabel),
        el("textarea", { id: "impl", name: "impl", rows: "4" }),
        el("p", { class: "no-save-note" }, data.noSaveNote),
        el("button", { type: "button", class: "btn-continue", onclick: ctx.onAdvance }, data.advanceLabel),
      ]
    );
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
          el("p", {}, q.note),
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
// CardGridScreen — screen 2
// ---------------------------------------------------------------------
export function renderCardGridScreen(screen, ctx) {
  const { data, id } = screen;
  const cards = el(
    "ul",
    { class: "card-grid" },
    data.cards.map((card) =>
      el("li", { class: "card", style: `--card-color: ${card.color}` }, [
        el("img", {
          src: `assets/icons/${card.icon}`,
          alt: "",
          "aria-hidden": "true",
          class: "icon-5d",
        }),
        el("h2", {}, card.d),
        el("p", {}, card.text),
      ])
    )
  );

  return el(
    "section",
    { class: "screen screen--cardgrid", "aria-labelledby": `s${id}-title`, tabindex: "-1" },
    [
      backButton(ctx.canGoBack ? ctx.onBack : null),
      el("h1", { id: `s${id}-title` }, data.framingLine),
      el("p", { class: "intro" }, data.intro),
      cards,
      el("p", { class: "closing" }, data.closing),
      el("button", { type: "button", class: "btn-continue", onclick: ctx.onAdvance }, data.advanceLabel),
    ]
  );
}

// ---------------------------------------------------------------------
// ScenarioScreen — screens 4, 5, 6, 7, 8, 9, 10
// ---------------------------------------------------------------------
export function renderScenarioScreen(screen, ctx) {
  const { data, id, scored, scenarioNumber, weighted } = screen;

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

    // Populate content first, then unhide on next frame — a `hidden`
    // element with content already in place may never announce; binding
    // order matters for the aria-live region to fire reliably.
    feedbackPanel.innerHTML = "";
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
    el("h1", { id: `s${id}-title`, class: "visually-hidden-optional" }, `Scenario ${scenarioNumber}`),
    scored === false ? el("p", { class: "unscored-label" }, "Not scored") : null,
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
    case "CardGridScreen":
      return renderCardGridScreen(screen, ctx);
    case "ScenarioScreen":
      return renderScenarioScreen(screen, ctx);
    default:
      throw new Error(`Unknown component: ${screen.component}`);
  }
}
