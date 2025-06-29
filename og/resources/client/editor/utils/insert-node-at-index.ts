import {getNodeIndex} from './get-node-index';
import {getNodeId} from './get-node-id';

export function insertNodeAtIndex(
  el: HTMLElement,
  parentEl: HTMLElement,
  index: number,
  clone = true,
) {
  el = clone ? (el.cloneNode(true) as HTMLElement) : el;
  if (index < 0) {
    parentEl.prepend(el);
  } else {
    // if parent already contains this node, and we're changing
    // node's index within parent, need to adjust index by one
    if (
      el.parentElement &&
      getNodeId(el.parentElement) === getNodeId(parentEl)
    ) {
      const currentNodeIndex = getNodeIndex(el);
      if (currentNodeIndex > -1 && currentNodeIndex <= index) {
        index++;
      }
    }
    const ref = parentEl.children.item(index);
    if (ref) {
      ref.before(el);
    } else {
      parentEl.append(el);
    }
  }
}
