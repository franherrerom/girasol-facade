// A Day: scrolling moves time from sunrise to after dark.

import { createFacade, applySky, prefersReducedMotion } from "./model.js";

const DAILY_KWH = 1150; // SPEC.md concept figure

const canvas = document.getElementById("model");
const counter = document.getElementById("counter");
const hint = document.getElementById("hint");
const chapters = [...document.querySelectorAll(".chapter")];
const reduced = prefersReducedMotion();
const phone = matchMedia("(max-width: 759px)");

// Forty squares for forty homes
const homes = document.getElementById("homes");
for (let i = 0; i < 40; i++) {
  const square = document.createElement("span");
  square.style.setProperty("--i", i);
  homes.appendChild(square);
}

// Diagrams animate when their chapter comes into view
const seen = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("is-visible");
  });
}, { threshold: 0.35 });
chapters.forEach((c) => seen.observe(c));

// Energy collected so far: the area under the sun's arc, scaled to the daily total
const energyAt = (t) => {
  const k = Math.min(Math.max(t, 0), 1);
  return DAILY_KWH * (1 - Math.cos(Math.PI * k)) / 2;
};
const showCounter = (t) => {
  counter.textContent = Math.round(energyAt(t)).toLocaleString("en-US");
};

let facade = null;
try {
  facade = createFacade(canvas, {
    mode: "day",
    flow: true,
    time: 0,
    onFrame: (state) => {
      applySky(state.t);
      showCounter(state.t);
    }
  });
} catch (error) {
  canvas.hidden = true;
}

/* ---------- Scroll to time ---------- */
const smooth = (a, b, v) => {
  const k = Math.min(Math.max((v - a) / (b - a), 0), 1);
  return k * k * (3 - 2 * k);
};

let lastSide = null;
let lastExplode = null;

// Fade the model out and back in around a change (reduced motion)
function fadeSwap(change) {
  canvas.classList.add("is-fading");
  setTimeout(() => {
    change();
    canvas.classList.remove("is-fading");
  }, 300);
}

function readScroll() {
  // Where the reader is looking: the middle of the screen,
  // or the middle of the text area below the model on a phone
  const focus = scrollY + innerHeight * (phone.matches ? 0.775 : 0.5);

  const marks = chapters.map((c) => {
    const top = c.getBoundingClientRect().top + scrollY;
    const h = c.offsetHeight;
    // Long chapters hold their time across most of their length
    const hold = c.classList.contains("is-long") ? h * 0.35 : 0;
    return {
      el: c,
      t: parseFloat(c.dataset.time),
      from: top + h / 2 - hold,
      to: top + h / 2 + hold
    };
  });

  let t = marks[0].t;
  let current = marks[0];
  if (focus >= marks[marks.length - 1].to) {
    t = marks[marks.length - 1].t;
    current = marks[marks.length - 1];
  } else {
    for (let i = 0; i < marks.length; i++) {
      const m = marks[i];
      if (focus >= m.from && focus <= m.to) {
        t = m.t;
        current = m;
        break;
      }
      const next = marks[i + 1];
      if (next && focus > m.to && focus < next.from) {
        const k = (focus - m.to) / (next.from - m.to);
        t = m.t + (next.t - m.t) * k;
        current = k < 0.5 ? m : next;
        break;
      }
    }
  }

  // Noon: the building comes apart, then back together
  let explode = 0;
  const noon = chapters.find((c) => c.hasAttribute("data-explode"));
  if (noon) {
    const q = (focus - (noon.getBoundingClientRect().top + scrollY)) / noon.offsetHeight;
    explode = smooth(0.18, 0.4, q) * (1 - smooth(0.62, 0.84, q));
  }

  return { t, side: current.el.dataset.side, explode };
}

function update() {
  if (!facade) {
    showCounter(readScroll().t);
    return;
  }
  const { t, side, explode } = readScroll();
  facade.setTime(t);

  // Model on the left means side 1, on the right side -1; no swap on a phone
  const sideValue = phone.matches ? 0 : side === "left" ? 1 : -1;
  document.body.dataset.model = side;
  if (sideValue !== lastSide) {
    if (reduced && lastSide !== null) fadeSwap(() => facade.setSide(sideValue, true));
    else facade.setSide(sideValue, lastSide === null);
    lastSide = sideValue;
  }

  if (reduced) {
    const step = explode > 0.5 ? 1 : 0;
    if (step !== lastExplode) {
      if (lastExplode !== null) fadeSwap(() => facade.setExplode(step, true));
      else facade.setExplode(step, true);
      lastExplode = step;
    }
  } else {
    facade.setExplode(explode);
  }
}

function layout() {
  if (facade) facade.setFrameFraction(phone.matches ? 1 : 7 / 12);
  lastSide = null;
  update();
}

addEventListener("scroll", update, { passive: true });
addEventListener("resize", layout);
phone.addEventListener("change", layout);
layout();

// Start at the true time if the page opens part-way down
if (facade) facade.setTime(readScroll().t, true);

/* ---------- Tap a triangle ---------- */
let flying = false;
canvas.addEventListener("click", async (event) => {
  if (!facade || flying) return;
  const index = facade.pick(event.clientX, event.clientY);
  if (index < 0) return;
  flying = true;
  hint.classList.add("is-done");
  if (!reduced) await facade.flyTo(index);
  location.href = "module.html";
});
