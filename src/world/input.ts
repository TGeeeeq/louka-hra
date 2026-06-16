// Sdílený vstup pro pohyb — čte ho herní smyčka, zapisují klávesnice i D-pad.
export const input = { up: false, down: false, left: false, right: false };

let actionQueued = false;
export function queueAction() {
  actionQueued = true;
}
export function consumeAction(): boolean {
  const a = actionQueued;
  actionQueued = false;
  return a;
}
export function resetInput() {
  input.up = input.down = input.left = input.right = false;
  actionQueued = false;
}
