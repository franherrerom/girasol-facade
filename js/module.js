// The Module: one triangle up close. Turn it, open it, take it apart.

import { createModule, applySky, prefersReducedMotion } from "./model.js";

const canvas = document.getElementById("model");
const slider = document.getElementById("open");
const output = document.getElementById("open-value");
const explodeBtn = document.getElementById("explode");
const hint = document.getElementById("hint");
const reduced = prefersReducedMotion();

applySky(0.5); // the module is shown in full noon light

let module = null;
try {
  module = createModule(canvas, {
    open: slider.value / 100,
    labels: {
      frame: document.getElementById("label-frame"),
      leaves: document.getElementById("label-leaves"),
      cells: document.getElementById("label-cells"),
      motors: document.getElementById("label-motors")
    },
    onInteract: () => hint.classList.add("is-done")
  });
} catch (error) {
  canvas.hidden = true;
}

slider.addEventListener("input", () => {
  output.textContent = slider.value + "%";
  if (module) module.setOpen(slider.value / 100);
});

explodeBtn.addEventListener("click", () => {
  const apart = explodeBtn.getAttribute("aria-pressed") !== "true";
  explodeBtn.setAttribute("aria-pressed", String(apart));
  explodeBtn.textContent = apart ? "Put it back" : "Take it apart";
  if (!module) return;
  if (reduced) {
    canvas.classList.add("is-fading");
    setTimeout(() => {
      module.setExplode(apart ? 1 : 0, true);
      canvas.classList.remove("is-fading");
    }, 300);
  } else {
    module.setExplode(apart ? 1 : 0);
  }
});
