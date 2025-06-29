import {getNodeId} from './get-node-id';

export function getNodeIndex(child: HTMLElement): number {
  const children = child?.parentElement?.children;
  const childId = getNodeId(child);

  if (children) {
    for (let i = 0; i <= children.length; i++) {
      if (childId === getNodeId(children.item(i) as HTMLElement)) {
        return i;
      }
    }
  }

  return -1;
}
