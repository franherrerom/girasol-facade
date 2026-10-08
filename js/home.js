// Home: the facade opens toward the sun, then the visitor drags the sun.

import { createFacade, applySky } from "./model.js";

const canvas = document.getElementById("model");
const text = document.getElementById("home-text");
const hint = document.getElementById("hint");

const START = -0.08; // just before sunrise
const MORNING = 0.3; // where the opening ends
let facade = null;
let textShown = false;

function showText() {
  if (textShown) return;
  textShown = true;
  text.classList.add("is-shown");
}

applySky(START);

try {
  facade = createFacade(canvas, {
    mode: "home",
    intro: true,
    introFrom: START,
    time: MORNING,
    onFrame: (state) => applySky(state.t),
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
  let dragging = false;
  let acted = false;

  // Right edge is sunrise (east), left edge is after sunset (west)
  const timeFromX = (clientX) => {
    const r = canvas.getBoundingClientRect();
    const k = (clientX - r.left) / r.width;
    return -0.1 + 1.3 * (1 - k);
  };

  const act = () => {
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
    if (dragging) facade.setTime(timeFromX(event.clientX));
  });
  const stop = () => (dragging = false);
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);

  canvas.addEventListener("keydown", (event) => {
    if (facade.isIntroPlaying()) return;
    const step = 0.04;
    const t = facade.state.tTarget;
    if (event.key === "ArrowLeft") facade.setTime(Math.min(1.2, t + step));
    else if (event.key === "ArrowRight") facade.setTime(Math.max(-0.1, t - step));
    else return;
    event.preventDefault();
    act();
  });
}
