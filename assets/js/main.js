// Wires the brass, the header controls and the duck to the page.
// Without this script the site reads the same; it just stays tidy.

import { createBrass } from "./brass.js";
import { initDuck } from "./duck.js";
import { createSound } from "./sound.js";

const MILESTONES = new Map([
  [50, "50 brass. You're warmed up."],
  [100, "100 rounds. Good range day."],
  [250, "250. Someone's paying for all this ammo."],
  [500, "500 brass. Maybe sweep up?"],
  [1000, "1,000. The duck is impressed."],
]);
const INTERACTIVE = "a, button, input, select, textarea, label, summary, [contenteditable]";
const HOLD_DELAY = 300;
const HOLD_RATE = 100;

const sound = createSound();
const counters = document.querySelectorAll("[data-brass-count]");
const toast = document.querySelector("[data-brass-toast]");
let toastTimer = 0;

function showToast(message) {
  if (!toast) {
    return;
  }
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.textContent = "";
  }, 3500);
}

function showCount(count, bumped) {
  for (const counter of counters) {
    counter.textContent = count.toLocaleString("en");
    if (bumped) {
      counter.classList.remove("is-bumped");
      void counter.offsetWidth;
      counter.classList.add("is-bumped");
    }
  }
  if (bumped && MILESTONES.has(count)) {
    showToast(MILESTONES.get(count));
  }
}

const brass = createBrass({ sound, onCount: showCount });
showCount(brass.count, false);

for (const element of document.querySelectorAll("[data-brass-controls], [data-brass-drop], [data-brass-hint]")) {
  element.hidden = false;
}

document.querySelector("[data-brass-sweep]")?.addEventListener("click", () => {
  const swept = brass.count;
  brass.sweep();
  if (swept > 0) {
    showToast(`Swept up ${swept.toLocaleString("en")} brass.`);
  }
});

const soundButton = document.querySelector("[data-brass-sound]");
soundButton?.setAttribute("aria-pressed", String(sound.enabled));
soundButton?.addEventListener("click", () => {
  sound.setEnabled(!sound.enabled);
  soundButton.setAttribute("aria-pressed", String(sound.enabled));
});

// Keyboard-friendly way to fire: the casing comes out of the button's top-right corner.
document.querySelector("[data-brass-drop]")?.addEventListener("click", (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  brass.fire(rect.right - 12, rect.top + 4);
});

initDuck(document.querySelector("[data-duck]"), sound);

// Firing: a mouse fires on press and keeps firing while held. Touch fires on tap
// (a click), so scrolling a phone never sprays brass everywhere.
let lastMouseDown = -Infinity;
let holdDelay = 0;
let holdRepeat = 0;
let pointer = { x: 0, y: 0 };

function isInteractive(target) {
  return target instanceof Element && target.closest(INTERACTIVE) !== null;
}

function stopHolding() {
  clearTimeout(holdDelay);
  clearInterval(holdRepeat);
}

document.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse" || event.button !== 0 || isInteractive(event.target)) {
    return;
  }
  lastMouseDown = performance.now();
  pointer = { x: event.clientX, y: event.clientY };
  brass.fire(pointer.x, pointer.y);
  stopHolding();
  holdDelay = setTimeout(() => {
    holdRepeat = setInterval(() => brass.fire(pointer.x, pointer.y), HOLD_RATE);
  }, HOLD_DELAY);
});

document.addEventListener("pointermove", (event) => {
  pointer = { x: event.clientX, y: event.clientY };
});

for (const type of ["pointerup", "pointercancel"]) {
  document.addEventListener(type, stopHolding);
}
window.addEventListener("blur", stopHolding);

document.addEventListener("click", (event) => {
  // event.detail is 0 for keyboard-triggered clicks.
  if (event.detail === 0 || performance.now() - lastMouseDown < 800 || isInteractive(event.target)) {
    return;
  }
  brass.fire(event.clientX, event.clientY);
});
