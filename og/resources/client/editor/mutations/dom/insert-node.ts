import {BaseMutation} from '../base-mutation';
import {getNodeId} from '../../utils/get-node-id';
import {insertNodeAtIndex} from '../../utils/insert-node-at-index';
import {nodeOrParentEditable} from '../../utils/node-or-parent-editable';
import {addIdToNode} from '../../utils/add-id-to-node';
import {message} from '@common/i18n/message';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
import {editorState} from '@app/editor/state/editor-store';

export class InsertNode extends BaseMutation {
  displayName = message('Inserted element');
  changes = {new: null, old: null};

  constructor(
    protected el: HTMLElement,
    protected newIndex: number,
    protected newParent: string,
  ) {
    super(el);
  }

  static canInsertInto(el: HTMLElement) {
    return el && !nodeOrParentEditable(el) && el.nodeName !== 'HTML';
  }

  getNodeId(): string | null {
    return this.nodeId;
  }

  protected onBeforeExecute() {
    if (!this.nodeId) {
      addIdToNode(this.el, true);
    }
    this.nodeId = getNodeId(this.el)!;
  }

  protected executeMutation(doc: Document): boolean {
    const parentEl = this.findEl(doc, this.newParent);
    if (!parentEl || !InsertNode.canInsertInto(parentEl)) {
      return false;
    }
    insertNodeAtIndex(this.el, parentEl, this.newIndex, true);
    if (doc === this.previewDoc) {
      setSelectedContext(this.nodeId);
    }
    return true;
  }

  protected undoMutation(doc: Document): boolean {
    const insertedEl = this.findEl(doc);
    if (insertedEl) {
      insertedEl.remove();
      if (
        doc === this.previewDoc &&
        editorState().selectedContext?.nodeId === this.nodeId
      ) {
        setSelectedContext(this.newParent);
      }
      return true;
    }
    return false;
  }
}
