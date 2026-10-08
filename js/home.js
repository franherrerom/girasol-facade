// Home: the facade opens toward the sun, then the day keeps moving on its own.
// The sun dial sets the time of day: spin it and the sun, the sky and every
// module follow. A few seconds after letting go, the day carries on.

import { createFacade, applySky } from "./model.js";

const canvas = document.getElementById("model");
const text = document.getElementById("home-text");
const dialWrap = document.getElementById("dial-wrap");
const dial = document.getElementById("dial");
const dialSun = document.getElementById("dial-sun");
const dialTime = document.getElementById("dial-time");
const dialTicks = document.getElementById("dial-ticks");
const titleMark = document.querySelector(".title-mark");
const hint = document.getElementById("hint");

const START = -0.08;        // just before sunrise
const MORNING = 0.3;        // where the opening ends
const DAY_RATE = 12 / 30;   // hours per second from 6 to 18: 30 seconds of daylight
const NIGHT_RATE = 12 / 10; // hours per second at night: 10 seconds of dark
const RESUME_AFTER = 5000;  // ms after the last spin before the day moves again
const TEXT_DELAY = 900;     // ms after the model appears before the text fades in
const FRICTION = 2.5;       // how quickly a spin slows down

// Model time t: 0 sunrise (6 h), 0.5 noon (12 h), 1 sunset (18 h)
const tFromHour = (h) => (h - 6) / 12;
const hourFromT = (t) => (((t * 12 + 6) % 24) + 24) % 24;
const wrapHour = (h) => ((h % 24) + 24) % 24;
// Dial angle in degrees, clockwise from the top: noon on top, sunrise on the right
const angleFromHour = (h) => (12 - h) * 15;

let facade = null;
let textShown = false;
let hour = hourFromT(START);
let velocity = 0; // hours per second, while a spin carries on
let dragging = false;
let lastTouch = 0;
let lastFrame = performance.now();
let shownMinute = -1;

/* ---------- Dial face ---------- */
for (let h = 0; h < 24; h++) {
  const major = h % 6 === 0;
  const a = (angleFromHour(h) * Math.PI) / 180;
  const r1 = 80;
  const r2 = major ? 68 : 74;
  const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
  tick.setAttribute("class", major ? "dial-tick is-major" : "dial-tick");
  tick.setAttribute("x1", 100 + r1 * Math.sin(a));
  tick.setAttribute("y1", 100 - r1 * Math.cos(a));
  tick.setAttribute("x2", 100 + r2 * Math.sin(a));
  tick.setAttribute("y2", 100 - r2 * Math.cos(a));
  dialTicks.appendChild(tick);
}

function drawDial(h) {
  const angle = angleFromHour(h);
  dialSun.setAttribute("transform", `rotate(${angle.toFixed(2)} 100 100)`);
  if (titleMark) titleMark.style.setProperty("--sun-turn", `${angle.toFixed(1)}deg`);

  const minute = Math.floor(h * 60) % 1440;
  if (minute !== shownMinute) {
    shownMinute = minute;
    const label = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    dialTime.textContent = label;
    dial.setAttribute("aria-valuenow", (minute / 60).toFixed(1));
    dial.setAttribute("aria-valuetext", label);
  }
}

/* ---------- Time ---------- */
function setHour(h, instant = false) {
  hour = wrapHour(h);
  if (!facade) return;
  const t = tFromHour(hour);
  // Crossing midnight jumps from one end of the night to the other: no easing
  const jump = Math.abs(t - facade.state.t) > 1;
  facade.setTime(t, instant || jump);
}

function showText() {
  if (textShown) return;
  textShown = true;
  text.classList.add("is-shown");
  dialWrap.classList.add("is-shown");
}

function tick() {
  const now = performance.now();
  const dt = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;

  if (facade.isIntroPlaying()) {
    hour = hourFromT(facade.state.t);
  } else if (!dragging) {
    if (Math.abs(velocity) > 0.02) {
      // A spin carries on and eases to a stop
      setHour(hour + velocity * dt);
      velocity *= Math.exp(-FRICTION * dt);
      lastTouch = now;
    } else if (now - lastTouch > RESUME_AFTER) {
      const rate = hour >= 6 && hour < 18 ? DAY_RATE : NIGHT_RATE;
      setHour(hour + rate * dt);
    }
  }
  drawDial(hourFromT(facade.state.t));
}

applySky(START);
drawDial(hour);

try {
  facade = createFacade(canvas, {
    mode: "home",
    intro: true,
    introFrom: START,
    time: MORNING,
    skyline: true,
    ground: true,
    onFrame: (state) => {
      applySky(state.t);
      tick();
    },
    // The text follows the model shortly, while the opening plays
    onReady: () => setTimeout(showText, TEXT_DELAY),
    onIntroEnd: () => {
      lastTouch = performance.now() - RESUME_AFTER; // the day carries on straight away
    }
  });

  // Wide screens: the building sits in the right 7 columns, clear of the text.
  // Phones: a little smaller, between the text and the dial.
  const wide = matchMedia("(min-width: 760px)");
  const place = () => {
    facade.setFrameFraction(wide.matches ? 7 / 12 : 0.5);
    facade.setSide(wide.matches ? -1 : 0, true);
    facade.setLift(wide.matches ? 0 : 0.05);
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

/* ---------- Spinning the dial ---------- */
let acted = false;
const act = () => {
  lastTouch = performance.now();
  if (acted) return;
  acted = true;
  hint.classList.add("is-done");
};

// Pointer angle in degrees, clockwise from the top of the dial
function pointerAngle(event) {
  const r = dial.getBoundingClientRect();
  const dx = event.clientX - (r.left + r.width / 2);
  const dy = event.clientY - (r.top + r.height / 2);
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

let lastAngle = 0;
let lastMove = 0;

dial.addEventListener("pointerdown", (event) => {
  // Spinning during the opening takes over straight away
  if (facade && facade.isIntroPlaying()) facade.endIntro();
  dragging = true;
  velocity = 0;
  lastAngle = pointerAngle(event);
  lastMove = performance.now();
  dial.setPointerCapture(event.pointerId);
  act();
});

dial.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  const angle = pointerAngle(event);
  let delta = angle - lastAngle;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  lastAngle = angle;

  const now = performance.now();
  const dt = Math.max((now - lastMove) / 1000, 0.008);
  lastMove = now;

  // Turning clockwise goes back in time (sunrise is on the right)
  const dh = -delta / 15;
  setHour(hour + dh);
  velocity = velocity * 0.6 + (dh / dt) * 0.4;
  act();
});

const release = () => {
  if (!dragging) return;
  dragging = false;
  // A slow, deliberate turn stops where it is; a flick keeps spinning
  if (performance.now() - lastMove > 80 || Math.abs(velocity) < 0.5) velocity = 0;
  velocity = Math.max(-12, Math.min(12, velocity));
  lastTouch = performance.now();
};
dial.addEventListener("pointerup", release);
dial.addEventListener("pointercancel", release);

dial.addEventListener("keydown", (event) => {
  const steps = { ArrowUp: 0.5, ArrowRight: 0.5, ArrowDown: -0.5, ArrowLeft: -0.5, PageUp: 3, PageDown: -3 };
  if (!(event.key in steps)) return;
  event.preventDefault();
  if (facade && facade.isIntroPlaying()) facade.endIntro();
  velocity = 0;
  setHour(hour + steps[event.key]);
  act();
});
