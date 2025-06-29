import {BaseMutation} from '../base-mutation';
import {insertNodeAtIndex} from '../../utils/insert-node-at-index';
import {nodeOrParentEditable} from '../../utils/node-or-parent-editable';
import {message} from '@common/i18n/message';

interface Options {
  el: HTMLElement; // node being moved
  oldIndex: number;
  oldParentId: string;
  newIndex: number;
  newParentId: string;
  onMutate?: () => void;
}

export class MoveNode extends BaseMutation {
  displayName = message('Repositioned element');
  changes: {
    new: {index: number; parentId: string};
    old: {index: number; parentId: string};
  };

  constructor(protected options: Options) {
    super(options.el);
    this.changes = {
      new: {index: options.newIndex, parentId: options.newParentId},
      old: {index: options.oldIndex, parentId: options.oldParentId},
    };
  }

  static canMoveNodeInto(el: HTMLElement) {
    return el && !nodeOrParentEditable(el) && el.nodeName !== 'HTML';
  }

  protected executeMutation(doc: Document): boolean {
    const parentEl = this.findEl(doc, this.changes.new.parentId);
    const el = this.findEl(doc);
    if (!el || !parentEl || !MoveNode.canMoveNodeInto(parentEl)) {
      return false;
    }
    insertNodeAtIndex(el, parentEl, this.changes.new.index, false);
    this.options.onMutate?.();
    return true;
  }

  protected undoMutation(doc: Document): boolean {
    const parentEl = this.findEl(doc, this.changes.old.parentId);
    const el = this.findEl(doc);
    if (!el || !parentEl || !MoveNode.canMoveNodeInto(parentEl)) {
      return false;
    }
    insertNodeAtIndex(el, parentEl, this.changes.old.index, false);
    this.options.onMutate?.();
    return true;
  }
}
