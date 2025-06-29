import {nanoid} from 'nanoid';

export function addIdToNode(node: HTMLElement, recursive = false) {
  if (!node.dataset.arId) {
    node.dataset.arId = nanoid(10);
  }
  if (recursive) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i] as HTMLElement;
      addIdToNode(child, true);
      child.dataset.arId = nanoid(10);
    }
  }
}
