export function nodeOrParentEditable(node: HTMLElement): boolean {
  if (node?.hasAttribute('contenteditable')) return true;
  return node?.parentElement?.hasAttribute('contenteditable') ?? false;
}
