export function nodeIsColumn(node: HTMLElement): boolean {
  for (let i = 0; i < node.classList.length; i++) {
    if (node.classList.item(i)?.match(/col-.*/)) {
      return true;
    }
  }
  return false;
}
