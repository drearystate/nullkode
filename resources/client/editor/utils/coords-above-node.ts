export function coordsAboveNode(
  node: HTMLElement,
  x: number,
  y: number,
): boolean {
  // check if cursor is above or to the left of the node
  if (node.nodeName === '#text') return false;

  const rect = node.getBoundingClientRect();

  if (y < rect.bottom) {
    return y < rect.top || x < rect.left;
  }

  return false;
}
