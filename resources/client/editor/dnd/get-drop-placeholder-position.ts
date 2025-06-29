import {coordsAboveNode} from '@app/editor/utils/coords-above-node';
import {getNodeId} from '@app/editor/utils/get-node-id';
import {ArchitectElement} from '@app/editor/elements/architect-element';
import {getNodeIndex} from '@app/editor/utils/get-node-index';
import {Elements} from '@app/editor/elements/elements';
import {removePaddingFromPosition} from '@app/editor/utils/remove-padding-from-position';
import {nodeIsColumn} from '@app/editor/editor-sidebar/layout-editor/node-is-column';

export interface DragSessionData {
  left: number;
  top: number;
  width: number;
  arrow: 'top' | 'bottom' | 'both';
  newIndex: number | null;
  newParent: string | null;
  oldIndex?: number | null;
  oldParent?: string | null;
}

export function getDropPlaceholderPosition(
  nodeUnderCursor: HTMLElement,
  draggable: {
    el: ArchitectElement;
    node?: HTMLElement;
  },
  pos: {x: number; y: number},
): DragSessionData | null {
  if (!nodeUnderCursor) return null;

  // If cursor is above any of the specified node's children,
  // and we can insert element as specified node's child,
  // insert element before child cursor is currently above
  for (let i = 0, len = nodeUnderCursor.children.length; i < len; i++) {
    const child = nodeUnderCursor.children[i] as HTMLElement;
    if (
      Elements.canInsertElInto(nodeUnderCursor, draggable.el) &&
      coordsAboveNode(child, pos.x, pos.y)
    ) {
      return {
        ...getPositionFor(child, draggable, 'above'),
        newParent: getNodeId(nodeUnderCursor),
      };
    }
  }

  const rect = nodeUnderCursor.getBoundingClientRect();
  const relativeY = pos.y - rect.top;
  // if y is within element - 5px at top and bottom
  const cursorInCenter = relativeY > 5 && relativeY < rect.height - 5;

  // insert into the node, if it's empty
  if (
    (nodeUnderCursor.childElementCount === 0 ||
      nodeUnderCursor.nodeName === 'BODY') &&
    cursorInCenter &&
    Elements.canInsertElInto(nodeUnderCursor, draggable.el)
  ) {
    return {
      ...getPositionFor(nodeUnderCursor, draggable, 'inside'),
      newParent: getNodeId(nodeUnderCursor),
    };
  }

  // insert above or below the node
  if (
    nodeUnderCursor.parentElement &&
    Elements.canInsertElInto(nodeUnderCursor.parentElement, draggable.el)
  ) {
    const newParent = getNodeId(nodeUnderCursor.parentElement);
    const cursorInTopHalfOfNode = relativeY < rect.height / 2;
    if (cursorInTopHalfOfNode) {
      return {
        ...getPositionFor(nodeUnderCursor, draggable, 'above'),
        newParent,
      };
    } else {
      return {
        ...getPositionFor(nodeUnderCursor, draggable, 'below'),
        newParent,
      };
    }
  }

  return null;
}

function getPositionFor(
  target: HTMLElement,
  draggable: {
    el: ArchitectElement;
    node?: HTMLElement;
  },
  position: 'below' | 'above' | 'inside',
): DragSessionData {
  const targetBox = target.getBoundingClientRect();
  const parent = target.parentElement;

  const data: DragSessionData = {
    left: targetBox.left,
    width: targetBox.width,
    top: 0,
    arrow: 'top',
    newIndex: null,
    newParent: null,
  };

  if (position === 'inside') {
    data.top = targetBox.top + targetBox.height / 2;
    data.arrow = 'both';
    data.newIndex = 0;
  } else if (position === 'above') {
    data.top = targetBox.top;
    data.arrow = 'top';
    data.newIndex = getNodeIndex(target);
  } else {
    data.top = targetBox.top + targetBox.height;
    data.arrow = 'bottom';
    data.newIndex = getNodeIndex(target) + 1;
  }

  if (nodeIsColumn(target)) {
    removePaddingFromPosition(target, data);
  }

  // check if we're not trying to drop a node inside its child or itself
  const dragNode = draggable.node;
  if (
    dragNode &&
    (dragNode === target || dragNode === parent || dragNode.contains(parent))
  ) {
    data.newIndex = null;
    data.newParent = null;
  }

  return data;
}
