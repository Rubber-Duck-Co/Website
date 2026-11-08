// The hero duck squeaks when you squeeze it. CSS handles the squash; this adds
// the sound and replays the squash for keyboard presses, which have no :active.

export function initDuck(button, sound) {
  if (!button) {
    return;
  }
  let timer = 0;

  button.addEventListener("click", () => {
    sound.squeak();
    button.classList.remove("is-squeezed");
    // Force a reflow so the class change restarts the squash.
    void button.offsetWidth;
    button.classList.add("is-squeezed");
    clearTimeout(timer);
    timer = setTimeout(() => button.classList.remove("is-squeezed"), 140);
  });
}
