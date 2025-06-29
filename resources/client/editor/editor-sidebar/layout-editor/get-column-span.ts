export function getColumnSpan(node: HTMLElement): number {
  const matches = node.className.match(/col-[a-z]+-([0-9]+)/);
  return parseInt(matches ? matches[1] : '0');
}
