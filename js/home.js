// Home: the facade opens toward the sun, then the day keeps moving on its own.
// The visitor can drag the sun at any time; the day carries on after they let go.

import { createFacade, applySky } from "./model.js";

const canvas = document.getElementById("model");
const text = document.getElementById("home-text");
const hint = document.getElementById("hint");

const START = -0.08;       // just before sunrise
const MORNING = 0.3;       // where the opening ends
const NIGHT_FROM = -0.2;   // the day loops from night to night
const NIGHT_TO = 1.2;
const DAY_SECONDS = 45;    // one full day when nobody is dragging
const RESUME_AFTER = 5000; // ms after the last drag before the day moves again

let facade = null;
let textShown = false;
let dragging = false;
let lastTouch = 0;
let lastFrame = performance.now();

function showText() {
  if (textShown) return;
  textShown = true;
  text.classList.add("is-shown");
}

// Moves the day forward a little every frame
function drift() {
  const now = performance.now();
  const dt = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;
  if (!facade || facade.isIntroPlaying() || dragging || now - lastTouch < RESUME_AFTER) return;

  const t = facade.state.tTarget + (dt * (NIGHT_TO - NIGHT_FROM)) / DAY_SECONDS;
  // Night to night: the jump back is invisible
  if (t > NIGHT_TO) facade.setTime(NIGHT_FROM, true);
  else facade.setTime(t);
}

applySky(START);

try {
  facade = createFacade(canvas, {
    mode: "home",
    intro: true,
    introFrom: START,
    time: MORNING,
    skyline: true,
    onFrame: (state) => {
      applySky(state.t);
      drift();
    },
    onIntroEnd: showText
  });
  // With reduced motion there is no opening sequence
  if (!facade.isIntroPlaying()) showText();

  // Wide screens: the building sits in the right 7 columns, clear of the text
  const wide = matchMedia("(min-width: 760px)");
  const place = () => {
    facade.setFrameFraction(wide.matches ? 7 / 12 : 1);
    facade.setSide(wide.matches ? -1 : 0, true);
    // Narrow screens: lift the building clear of the text at the bottom
    facade.setLift(wide.matches ? 0 : 0.22);
  };
  wide.addEventListener("change", place);
  place();
} catch (error) {
  // No WebGL: the page still works without the model
  canvas.hidden = true;
  applySky(MORNING);
  showText();
}

// Never leave the visitor waiting on the model
setTimeout(showText, 5000);

if (facade) {
  let acted = false;

  // Right edge is sunrise (east), left edge is after sunset (west)
  const timeFromX = (clientX) => {
    const r = canvas.getBoundingClientRect();
    const k = (clientX - r.left) / r.width;
    return -0.1 + 1.3 * (1 - k);
  };

  const act = () => {
    lastTouch = performance.now();
    if (acted) return;
    acted = true;
    hint.classList.add("is-done");
  };

  canvas.addEventListener("pointerdown", (event) => {
    if (facade.isIntroPlaying()) return;
    dragging = true;
    canvas.setPointerCapture(event.pointerId);
    facade.setTime(timeFromX(event.clientX));
    act();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    facade.setTime(timeFromX(event.clientX));
    act();
  });
  const stop = () => {
    dragging = false;
    lastTouch = performance.now();
  };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);

  canvas.addEventListener("keydown", (event) => {
    if (facade.isIntroPlaying()) return;
    const step = 0.04;
    const t = facade.state.tTarget;
    if (event.key === "ArrowLeft") facade.setTime(Math.min(NIGHT_TO, t + step));
    else if (event.key === "ArrowRight") facade.setTime(Math.max(NIGHT_FROM, t - step));
    else return;
    event.preventDefault();
    act();
  });
}
